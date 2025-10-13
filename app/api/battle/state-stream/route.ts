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

      // Note: Timer updates are now handled by worker via /timer-stream endpoint
      // This endpoint is kept for backward compatibility but no longer runs timers
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