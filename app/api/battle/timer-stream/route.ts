import { NextRequest } from 'next/server';

// Force Node.js runtime for SSE (Edge Runtime has limitations with streaming)
export const runtime = 'nodejs';

/**
 * GET /api/battle/timer-stream
 * Proxy SSE timer stream from worker to clients
 */
export async function GET(_request: NextRequest) {
  const workerUrl = process.env.WORKER_BASE_URL || 'https://battle-completion-worker-733567590021.us-central1.run.app';
  const timerStreamUrl = `${workerUrl}/timer-stream`;
  
  console.log(`🔄 Proxying timer stream from worker: ${timerStreamUrl}`);

  try {
    // Forward the request to the worker
    const workerResponse = await fetch(timerStreamUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

    if (!workerResponse.ok) {
      throw new Error(`Worker responded with status: ${workerResponse.status}`);
    }

    // Create a readable stream that forwards data from worker to client
    const stream = new ReadableStream({
      start(controller) {
        const reader = workerResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                controller.close();
                break;
              }
              
              controller.enqueue(value);
            }
          } catch (error) {
            console.error('Error proxying timer stream:', error);
            controller.error(error);
          }
        };

        pump();
      },
      
      cancel() {
        console.log('🔄 Timer stream proxy cancelled');
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });

  } catch (error) {
    console.error('Error connecting to worker timer stream:', error);
    
    // Return error response
    return new Response(
      `data: ${JSON.stringify({
        type: 'ERROR',
        error: 'Failed to connect to timer service',
        timestamp: new Date().toISOString()
      })}\n\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }
}
