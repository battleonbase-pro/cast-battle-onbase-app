import { NextRequest } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

// Store active SSE connections
const connections = new Set<ReadableStreamDefaultController>();

/**
 * GET /api/battle/sentiment-stream
 * Server-Sent Events endpoint for real-time sentiment updates
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the set
      connections.add(controller);
      
      // Send initial data
      sendInitialData(controller, encoder);
      
      // Send heartbeat every 15 seconds for mobile browsers (more frequent)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`));
        } catch (error) {
          console.error('Heartbeat error:', error);
          clearInterval(heartbeat);
        }
      }, 15000);
      
      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        connections.delete(controller);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch (error) {
          console.error('Error closing SSE connection:', error);
        }
      });
    },
    
    cancel() {
      connections.delete(controller);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'X-Accel-Buffering': 'no', // Disable nginx buffering for mobile
      'Transfer-Encoding': 'chunked',
    },
  });
}

/**
 * Send initial sentiment data to a new connection
 */
async function sendInitialData(controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  try {
    const battleManager = BattleManagerDB.getInstance();
    const currentBattle = await battleManager.getCurrentBattle();
    
    if (currentBattle) {
      const casts = await battleManager.getCurrentBattleCasts();
      const sentiment = calculateSentiment(casts);
      
      const data = {
        type: 'sentiment_update',
        sentiment,
        casts,
        battleId: currentBattle.id,
        timestamp: Date.now()
      };
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    }
  } catch (error) {
    console.error('Error sending initial SSE data:', error);
  }
}

/**
 * Calculate sentiment data from casts
 */
function calculateSentiment(casts: any[]) {
  const support = casts.filter(cast => cast.side === 'SUPPORT').length;
  const oppose = casts.filter(cast => cast.side === 'OPPOSE').length;
  const total = support + oppose;
  
  if (total === 0) {
    return { support: 0, oppose: 0, supportPercent: 0, opposePercent: 0 };
  }
  
  return {
    support,
    oppose,
    supportPercent: Math.round((support / total) * 100),
    opposePercent: Math.round((oppose / total) * 100)
  };
}

/**
 * Broadcast sentiment update to all connected clients
 * This function will be called when a new cast is submitted
 */
export async function broadcastSentimentUpdate(battleId: string, userAddress?: string) {
  try {
    const battleManager = BattleManagerDB.getInstance();
    const casts = await battleManager.getCurrentBattleCasts();
    const sentiment = calculateSentiment(casts);
    
    // Check if user has submitted (if userAddress provided)
    let userSubmissionStatus = undefined;
    if (userAddress) {
      const userCast = casts.find(cast => cast.userAddress && cast.userAddress.toLowerCase() === userAddress.toLowerCase());
      userSubmissionStatus = !!userCast;
    }
    
    const data = {
      type: 'sentiment_update',
      sentiment,
      casts,
      battleId,
      userSubmissionStatus,
      timestamp: Date.now()
    };
    
    const encoder = new TextEncoder();
    const message = `data: ${JSON.stringify(data)}\n\n`;
    
    // Broadcast to all connected clients
    connections.forEach(controller => {
      try {
        controller.enqueue(encoder.encode(message));
      } catch (error) {
        console.error('Error broadcasting to SSE client:', error);
        connections.delete(controller);
      }
    });
    
    console.log(`Broadcasted sentiment update to ${connections.size} clients`);
  } catch (error) {
    console.error('Error broadcasting sentiment update:', error);
  }
}
