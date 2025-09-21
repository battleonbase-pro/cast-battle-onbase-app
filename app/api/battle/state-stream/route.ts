import { NextRequest } from 'next/server';

// Store active SSE connections
const connections = new Set<{
  id: string;
  response: Response;
  controller: ReadableStreamDefaultController;
}>();

// Event emitter for battle state changes
class BattleEventEmitter {
  private listeners = new Map<string, Set<(data: any) => void>>();

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }
}

export const battleEventEmitter = new BattleEventEmitter();

export async function GET(request: NextRequest) {
  console.log('🔌 New SSE connection established');

  const encoder = new TextEncoder();
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      const connection = {
        id: connectionId,
        response: new Response(),
        controller
      };
      connections.add(connection);

      // Send initial connection confirmation
      const initialData = {
        type: 'CONNECTION_ESTABLISHED',
        connectionId,
        timestamp: new Date().toISOString()
      };
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

      // Listen for battle events
      const handleBattleEnded = (data: any) => {
        console.log(`📡 Broadcasting battle ended event to ${connections.size} connections`);
        const eventData = {
          type: 'BATTLE_ENDED',
          data: {
            battleId: data.battleId,
            title: data.title,
            timestamp: new Date().toISOString()
          }
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
      };

      const handleBattleStarted = (data: any) => {
        console.log(`📡 Broadcasting battle started event to ${connections.size} connections`);
        const eventData = {
          type: 'BATTLE_STARTED',
          data: {
            battleId: data.battleId,
            title: data.title,
            description: data.description,
            category: data.category,
            source: data.source,
            sourceUrl: data.sourceUrl,
            endTime: data.endTime,
            timestamp: new Date().toISOString()
          }
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
      };

      const handleBattleTransition = (data: any) => {
        console.log(`📡 Broadcasting battle transition event to ${connections.size} connections`);
        const eventData = {
          type: 'BATTLE_TRANSITION',
          data: {
            fromBattleId: data.fromBattleId,
            toBattleId: data.toBattleId,
            timestamp: new Date().toISOString()
          }
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
      };

      // Register event listeners
      battleEventEmitter.on('battleEnded', handleBattleEnded);
      battleEventEmitter.on('battleStarted', handleBattleStarted);
      battleEventEmitter.on('battleTransition', handleBattleTransition);

      // Cleanup function
      const cleanup = () => {
        battleEventEmitter.off('battleEnded', handleBattleEnded);
        battleEventEmitter.off('battleStarted', handleBattleStarted);
        battleEventEmitter.off('battleTransition', handleBattleTransition);
        connections.delete(connection);
        console.log(`🔌 SSE connection ${connectionId} closed`);
      };

      // Handle connection close
      request.signal.addEventListener('abort', cleanup);
      
      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = {
            type: 'HEARTBEAT',
            timestamp: new Date().toISOString()
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeatData)}\n\n`));
        } catch (error) {
          console.error('Heartbeat error:', error);
          clearInterval(heartbeat);
          cleanup();
        }
      }, 30000);

      // Cleanup heartbeat on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
      });
    },

    cancel() {
      console.log(`🔌 SSE connection ${connectionId} cancelled`);
      // Remove connection from set
      connections.forEach(conn => {
        if (conn.id === connectionId) {
          connections.delete(conn);
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Helper function to broadcast events to all connections
export function broadcastBattleEvent(type: string, data: any) {
  console.log(`📡 Broadcasting ${type} event to ${connections.size} connections`);
  
  const encoder = new TextEncoder();
  const eventData = {
    type,
    data,
    timestamp: new Date().toISOString()
  };
  
  const message = `data: ${JSON.stringify(eventData)}\n\n`;
  
  connections.forEach(connection => {
    try {
      connection.controller.enqueue(encoder.encode(message));
    } catch (error) {
      console.error('Error broadcasting to connection:', error);
      connections.delete(connection);
    }
  });
}
