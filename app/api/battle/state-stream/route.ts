import { NextRequest } from 'next/server';
import { addSSEConnection, markConnectionInactive } from '@/lib/services/battle-broadcaster';

// Force Node.js runtime for SSE (Edge Runtime has limitations with streaming)
export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔌 NEW CLIENT CONNECTED: ${connectionId}`);

  const encoder = new TextEncoder();

  // Note: Timer logic removed - now handled by worker via /timer-stream endpoint

  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      const connection = {
        id: connectionId,
        response: new Response(),
        controller
      };
      addSSEConnection(connection);

      // Send initial connection confirmation
      const initialData = {
        type: 'CONNECTION_ESTABLISHED',
        connectionId,
        timestamp: new Date().toISOString()
      };
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

      // Proxy timer updates from worker
      const workerUrl = process.env.WORKER_BASE_URL || 'https://battle-completion-worker-733567590021.us-central1.run.app';
      const timerStreamUrl = `${workerUrl}/timer-stream`;
      
      // Connect to worker timer stream and forward events
      fetch(timerStreamUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      }).then(async (workerResponse) => {
        if (!workerResponse.ok) {
          console.error(`Worker timer stream failed: ${workerResponse.status}`);
          return;
        }
        
        const reader = workerResponse.body?.getReader();
        if (!reader) return;
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Forward timer events to client
            if (controller.desiredSize !== null) {
              controller.enqueue(value);
            }
          }
        } catch (error) {
          console.error('Error forwarding timer stream:', error);
        }
      }).catch(error => {
        console.error('Error connecting to worker timer stream:', error);
      });
    },

    cancel() {
      console.log(`🔌 CLIENT DISCONNECTED: ${connectionId}`);
      markConnectionInactive(connectionId);
      // Keep connection alive for potential reconnection
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