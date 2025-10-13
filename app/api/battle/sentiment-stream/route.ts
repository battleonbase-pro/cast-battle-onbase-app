import { NextRequest } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';
import { addSentimentConnection, removeSentimentConnection } from '@/lib/services/sentiment-broadcaster';

/**
 * GET /api/battle/sentiment-stream
 * Server-Sent Events endpoint for real-time sentiment updates
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the set
      addSentimentConnection(controller);
      
      // Send initial data
      sendInitialData(controller, encoder);
      
      // Note: Heartbeat removed - not essential for sentiment updates
      // Timer updates are handled by worker via /timer-stream endpoint
      
      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        removeSentimentConnection(controller);
        try {
          controller.close();
        } catch (error) {
          console.error('Error closing SSE connection:', error);
        }
      });
    },
    
    cancel() {
      // Note: Connection cleanup is handled in the abort event listener above
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
 * Calculate sentiment data from casts
 */
function calculateSentiment(casts: Array<{ side: string }>) {
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
 * Send initial sentiment data to a new connection
 */
async function sendInitialData(controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  try {
    const battleManager = await BattleManagerDB.getInstance();
    const currentBattle = await battleManager.getCurrentBattleSafe();
    
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
      
      // Check if controller is still open before enqueuing
      if (controller.desiredSize !== null) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }
    }
  } catch (error) {
    console.error('Error sending initial SSE data:', error);
  }
}

