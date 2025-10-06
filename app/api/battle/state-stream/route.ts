import { NextRequest } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';
import { addSSEConnection, markConnectionInactive, getConnectionCount } from '@/lib/services/battle-broadcaster';

export async function GET(_request: NextRequest) {
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔌 NEW CLIENT CONNECTED: ${connectionId}`);
  console.log(`📊 Total active connections before: ${getConnectionCount()}`);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      const connection = {
        id: connectionId,
        response: new Response(),
        controller
      };
      addSSEConnection(connection);
      console.log(`📊 Total active connections after: ${getConnectionCount()}`);

      // Send initial connection confirmation
      const initialData = {
        type: 'CONNECTION_ESTABLISHED',
        connectionId,
        timestamp: new Date().toISOString()
      };
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

      // Set up battle timer to sync client countdown every 15 seconds
      const battleTimer = setInterval(async () => {
        try {
          // Check if controller is still open before writing
          if (controller.desiredSize === null) {
            console.log(`🔌 Controller closed for connection ${connectionId}`);
            markConnectionInactive(connectionId);
            // Don't clear intervals, keep connection alive
            return;
          }

          const battleManager = new BattleManagerDB();
          const currentBattle = await battleManager.getCurrentBattle();
          
          if (currentBattle && currentBattle.status === 'ACTIVE') {
            const now = new Date();
            const timeRemaining = Math.max(0, Math.floor((currentBattle.endTime.getTime() - now.getTime()) / 1000));
            
            const timerData = {
              type: 'TIMER_UPDATE',
              data: {
                battleId: currentBattle.id,
                timeRemaining,
                endTime: currentBattle.endTime.toISOString(),
                status: currentBattle.status
              },
              timestamp: new Date().toISOString()
            };
            
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(timerData)}\n\n`));
            } catch (writeError) {
              console.log(`🔌 Controller write failed for connection ${connectionId}, but keeping connection alive`);
              // Don't mark as inactive - keep connection alive for potential reconnection
              return;
            }
          }
        } catch (error) {
          console.error('Error in battle timer:', error);
          // Don't mark as inactive - keep connection alive for potential reconnection
        }
      }, 15000);

      // Set up heartbeat every 30 seconds
      const heartbeatTimer = setInterval(() => {
        try {
          // Check if controller is still open before writing
          if (controller.desiredSize === null) {
            console.log(`🔌 Controller closed for connection ${connectionId}`);
            markConnectionInactive(connectionId);
            // Don't clear intervals, keep connection alive
            return;
          }

          const heartbeatData = {
            type: 'HEARTBEAT',
            timestamp: new Date().toISOString()
          };
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeatData)}\n\n`));
          } catch (writeError) {
            console.log(`🔌 Controller write failed for connection ${connectionId}, but keeping connection alive`);
            // Don't mark as inactive - keep connection alive for potential reconnection
            return;
          }
        } catch (error) {
          console.error('Error in heartbeat timer:', error);
          // Don't mark as inactive - keep connection alive for potential reconnection
        }
      }, 30000);

      // Store cleanup function
      (controller as ReadableStreamDefaultController & { cleanup?: () => void }).cleanup = () => {
        console.log(`🔌 CLEANUP CALLED for connection ${connectionId} - User disconnected`);
        markConnectionInactive(connectionId);
        // Only mark inactive when user actually disconnects
      };
    },

    cancel() {
      console.log(`🔌 CLIENT DISCONNECTED: ${connectionId} - User closed browser/tab`);
      markConnectionInactive(connectionId);
      // Only mark inactive when user actually disconnects (closes browser/tab)
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}