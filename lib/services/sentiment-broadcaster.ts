import { BattleManagerDB } from '@/lib/services/battle-manager-db';

// Store active SSE connections
const connections = new Set<ReadableStreamDefaultController>();

/**
 * Add a connection to the sentiment stream
 */
export function addSentimentConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller);
}

/**
 * Remove a connection from the sentiment stream
 */
export function removeSentimentConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller);
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
 * Broadcast sentiment update to all connected clients
 * This function will be called when a new cast is submitted
 */
export async function broadcastSentimentUpdate(battleId: string, userAddress?: string) {
  try {
    const battleManager = await BattleManagerDB.getInstance();
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
