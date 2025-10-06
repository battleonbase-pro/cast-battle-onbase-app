/**
 * Battle Event Broadcaster Service
 * Handles direct broadcasting of battle events to SSE connections
 */

// Store active SSE connections
const connections = new Map<string, {
  id: string;
  response: Response;
  controller: ReadableStreamDefaultController;
  lastActivity: Date;
  isActive: boolean;
}>();

export function getConnectionCount() {
  return connections.size;
}

export function addSSEConnection(connection: {
  id: string;
  response: Response;
  controller: ReadableStreamDefaultController;
}) {
  connections.set(connection.id, {
    ...connection,
    lastActivity: new Date(),
    isActive: true
  });
  console.log(`📡 SSE connection added. Total connections: ${connections.size}`);
}

export function removeSSEConnectionById(connectionId: string) {
  const connectionToRemove = connections.get(connectionId);
  if (connectionToRemove) {
    connections.delete(connectionId);
    console.log(`📡 SSE connection ${connectionId} removed. Total connections: ${connections.size}`);
  }
  // Don't log "attempted to remove non-existent connection" - this is normal
}

export function markConnectionInactive(connectionId: string) {
  const connection = connections.get(connectionId);
  if (connection) {
    connection.isActive = false;
    connection.lastActivity = new Date();
    console.log(`📡 SSE connection ${connectionId} marked as inactive`);
  }
}

export function broadcastBattleEvent(type: string, data: any) {
  const activeConnections = Array.from(connections.values()).filter(conn => conn.isActive).length;
  console.log(`📡 Broadcasting ${type} event to ${connections.size} total connections (${activeConnections} active)`);
  
  if (connections.size === 0) {
    console.log(`⚠️ No connections to broadcast to!`);
    return;
  }
  
  const encoder = new TextEncoder();
  const eventData = {
    type,
    data,
    timestamp: new Date().toISOString()
  };
  
  const message = `data: ${JSON.stringify(eventData)}\n\n`;
  
  // Send to all connections
  let successCount = 0;
  let failureCount = 0;
  
  connections.forEach((connection, connectionId) => {
           try {
             // Check if controller is still writable
             if (connection.controller.desiredSize === null) {
               console.log(`🔌 Controller closed for connection ${connectionId}, but keeping connection alive`);
               // Don't mark as inactive - keep connection alive for potential reconnection
               failureCount++;
               return;
             }
             
             connection.controller.enqueue(encoder.encode(message));
             connection.lastActivity = new Date();
             successCount++;
             console.log(`✅ Successfully sent ${type} to connection ${connectionId}`);
           } catch (error) {
             console.error(`❌ Error broadcasting to connection ${connectionId}, but keeping connection alive:`, error);
             // Don't mark as inactive - keep connection alive for potential reconnection
             failureCount++;
           }
  });
  
  console.log(`📡 Broadcast complete: ${successCount} successful, ${failureCount} failed`);
  
  // Clean up inactive connections after a delay
  setTimeout(() => {
    connections.forEach((connection, connectionId) => {
      if (!connection.isActive) {
        connections.delete(connectionId);
        console.log(`🧹 Cleaned up inactive connection ${connectionId}`);
      }
    });
  }, 5000); // 5 second delay
}