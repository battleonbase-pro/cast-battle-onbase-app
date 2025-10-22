import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';
import { DebatePaymentFlowService } from '@/lib/services/debate-payment-flow-service';

// Force Node.js runtime for battle management
export const runtime = 'nodejs';

// Debate ID mapping - in production, this should come from database
const DEBATE_ID_MAPPING = {
  // Map battle IDs to on-chain debate IDs
  // For now, we'll use debate ID 2 which has 1 USDC entry fee
  default: 2
};

export async function GET(_request: NextRequest) {
  try {
    const battleManager = await BattleManagerDB.getInstance();
    
    // Get current battle to fetch its casts
    const currentBattle = await battleManager.getCurrentBattleSafe();
    if (!currentBattle) {
      return NextResponse.json({
        success: false,
        error: 'No active battle available'
      }, { status: 404 });
    }

    // Get casts for the current battle
    const db = await import('@/lib/services/database').then(m => m.default);
    const casts = await db.getCastsForBattle(currentBattle.id);

    // Transform casts to match frontend interface
    const transformedCasts = (casts || []).map((cast: any) => ({
      id: cast.id,
      content: cast.content,
      side: cast.side,
      userAddress: cast.user?.address || '', // Extract address from user object
      createdAt: cast.createdAt,
      user: cast.user // Keep user object for additional data if needed
    }));

    return NextResponse.json({
      success: true,
      casts: transformedCasts
    });

  } catch (error) {
    console.error('Error fetching casts:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch casts'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let userAddress: string | undefined;
  
  try {
    const body = await request.json();
    const { userAddress: address, content, side, transactionId } = body;
    userAddress = address;
    
    if (!userAddress || !content || !side) {
      console.log(`❌ Invalid cast submission attempt - missing fields: userAddress=${!!userAddress}, content=${!!content}, side=${!!side}`);
      return NextResponse.json({ 
        error: 'Missing required fields: userAddress, content, side' 
      }, { status: 400 });
    }
    
    if (!['SUPPORT', 'OPPOSE'].includes(side)) {
      console.log(`❌ User ${userAddress} submitted invalid side: ${side}`);
      return NextResponse.json({ 
        error: 'Side must be either SUPPORT or OPPOSE' 
      }, { status: 400 });
    }
    
    if (content.trim().length < 10) {
      console.log(`❌ User ${userAddress} submitted cast too short (${content.trim().length} chars): "${content.trim()}"`);
      return NextResponse.json({ 
        error: 'Cast content must be at least 10 characters long' 
      }, { status: 400 });
    }
    
    if (content.trim().length > 140) {
      console.log(`❌ User ${userAddress} submitted cast too long (${content.trim().length} chars): "${content.trim().substring(0, 50)}..."`);
      return NextResponse.json({ 
        error: 'Cast content must be 140 characters or less' 
      }, { status: 400 });
    }
    
    const battleManager = await BattleManagerDB.getInstance();
    
    // Get current battle
    const currentBattle = await battleManager.getCurrentBattleSafe();
    if (!currentBattle) {
      return NextResponse.json({ 
        error: 'No active battle available' 
      }, { status: 404 });
    }

    // Get debate ID for this battle
    const debateId = currentBattle.debateId || DEBATE_ID_MAPPING.default;
    
    // Initialize payment flow service
    const paymentFlowService = new DebatePaymentFlowService(debateId);
    
    // Check for X-PAYMENT header (x402 protocol)
    const xPaymentHeader = request.headers.get('X-PAYMENT');
    
    if (xPaymentHeader) {
      console.log(`🔍 Verifying X-PAYMENT header: ${xPaymentHeader}`);
      try {
        const paymentProof = JSON.parse(xPaymentHeader);
        const paymentResult = await paymentFlowService.checkExistingPayment(paymentProof.transactionId, userAddress);
        
        if (!paymentResult.success) {
          return NextResponse.json({ 
            error: paymentResult.error || 'Payment verification failed',
            requiresPayment: true
          }, { status: 402 });
        }
        console.log(`✅ X-PAYMENT verified successfully for transaction: ${paymentProof.transactionId}`);
      } catch (error) {
        console.error('❌ Invalid X-PAYMENT header:', error);
        return NextResponse.json({ 
          error: 'Invalid payment proof',
          requiresPayment: true
        }, { status: 402 });
      }
    } else if (transactionId) {
      // Legacy support: transaction ID in request body
      console.log(`🔍 Verifying payment for transaction: ${transactionId}`);
      const paymentResult = await paymentFlowService.checkExistingPayment(transactionId, userAddress);
      
      if (!paymentResult.success) {
        return NextResponse.json({ 
          error: paymentResult.error || 'Payment verification failed',
          requiresPayment: true
        }, { status: 402 });
      }
      console.log(`✅ Payment verified successfully for transaction: ${transactionId}`);
    } else {
      // No payment proof provided, check if user has already paid on-chain
      console.log(`💰 No payment proof provided, checking if user has already paid on-chain...`);
      const canParticipate = await paymentFlowService.canParticipate(userAddress);
      if (!canParticipate.canParticipate) {
        // x402 compliant Payment Required Response
        const paymentRequiredResponse = {
          x402Version: 1,
          accepts: [{
            scheme: "exact",
            network: "base-sepolia",
            maxAmountRequired: "1000000", // 1 USDC in atomic units (6 decimals)
            resource: "/api/battle/submit-cast",
            description: "Debate participation fee",
            mimeType: "application/json",
            payTo: process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS!, // DebatePool contract
            maxTimeoutSeconds: 30,
            asset: process.env.NEXT_PUBLIC_USDC_ADDRESS!, // USDC contract
            extra: {
              name: "USD Coin",
              version: "2"
            }
          }],
          error: canParticipate.reason || 'Payment required to submit cast'
        };
        
        return NextResponse.json(paymentRequiredResponse, { status: 402 });
      }
      console.log(`✅ User has already paid on-chain for this debate`);
    }
    
    // Check if user is already a participant in the current battle
    const isParticipant = currentBattle.participants.some((p: { user: { address: string } }) => p.user.address === userAddress);
    if (!isParticipant) {
      console.log(`🔄 User ${userAddress} not yet joined battle, joining automatically...`);
      const joinSuccess = await battleManager.joinBattle(userAddress);
      if (!joinSuccess) {
        console.log(`❌ Failed to join user ${userAddress} to battle`);
        return NextResponse.json({ 
          error: 'Failed to join battle' 
        }, { status: 500 });
      }
      console.log(`✅ User ${userAddress} automatically joined battle`);
    }
    
    // Check if user has already submitted a cast for this battle
    const db = await import('@/lib/services/database').then(m => m.default);
    const existingCasts = await db.getCastsForBattle(currentBattle.id);
    const userHasSubmitted = existingCasts.some((cast: any) => 
      cast.user?.address?.toLowerCase() === userAddress.toLowerCase()
    );
    
    if (userHasSubmitted) {
      console.log(`❌ User ${userAddress} has already submitted a cast for this battle`);
      return NextResponse.json({ 
        error: 'You have already submitted an argument for this debate. Only one submission per debate is allowed.',
        alreadySubmitted: true
      }, { status: 409 }); // 409 Conflict
    }
    
    // Create the cast
    const cast = await battleManager.createCast(userAddress, content.trim(), side);
    
    // Award participation points (10 points for submitting a cast)
    const userPoints = await db.awardParticipationPoints(userAddress, 10);
    
    // Log user submitting cast
    console.log(`📝 User ${userAddress} submitted cast (${side}) and earned 10 points! Total points: ${userPoints}`);
    
    // Broadcast cast submission event to SSE connections
    try {
      const { broadcastBattleEvent } = await import('@/lib/services/battle-broadcaster');
      
      // Get updated casts for sentiment calculation
      const updatedCasts = await db.getCastsForBattle(currentBattle.id);
      const support = updatedCasts.filter((c: any) => c.side === 'SUPPORT').length;
      const oppose = updatedCasts.filter((c: any) => c.side === 'OPPOSE').length;
      const total = support + oppose;
      
      if (total > 0) {
        const sentiment = {
          support,
          oppose,
          supportPercent: Math.round((support / total) * 100),
          opposePercent: Math.round((oppose / total) * 100)
        };
        
        // Broadcast sentiment update
        broadcastBattleEvent('SENTIMENT_UPDATE', { sentiment });
      }
      
      // Broadcast cast submission
      broadcastBattleEvent('CAST_SUBMITTED', {
        cast: {
          id: cast.id,
          content: cast.content,
          side: cast.side,
          userAddress: userAddress,
          createdAt: cast.createdAt
        }
      });
    } catch (broadcastError) {
      console.error('Failed to broadcast cast submission event:', broadcastError);
    }
    
    // Create settlement response for X-PAYMENT-RESPONSE header (x402 protocol)
    const settlementResponse = {
      success: true,
      txHash: xPaymentHeader ? JSON.parse(xPaymentHeader).transactionId : transactionId,
      networkId: "base-sepolia",
      timestamp: Date.now()
    };
    
    const response = NextResponse.json({ 
      success: true, 
      cast: {
        id: cast.id,
        content: cast.content,
        side: cast.side,
        createdAt: cast.createdAt
      },
      points: userPoints,
      pointsAwarded: 10
    });
    
    // Add X-PAYMENT-RESPONSE header (x402 protocol)
    if (xPaymentHeader || transactionId) {
      response.headers.set('X-PAYMENT-RESPONSE', Buffer.from(JSON.stringify(settlementResponse)).toString('base64'));
    }
    
    return response;
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error submitting cast:', error);
    console.log(`❌ User ${userAddress || 'unknown'} failed to submit cast: ${errorMessage}`);
    return NextResponse.json({ 
      error: 'Failed to submit cast' 
    }, { status: 500 });
  }
}
