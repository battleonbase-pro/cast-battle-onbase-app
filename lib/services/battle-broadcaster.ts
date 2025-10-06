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
  const activeCount = Array.from(connections.values()).filter(conn => conn.isActive).length;
  console.log(`📡 SSE connection added. Active connections: ${activeCount}`);
}

export function removeSSEConnectionById(connectionId: string) {
  const connectionToRemove = connections.get(connectionId);
  if (connectionToRemove) {
    connections.delete(connectionId);
    const activeCount = Array.from(connections.values()).filter(conn => conn.isActive).length;
    console.log(`📡 SSE connection removed. Active connections: ${activeCount}`);
  }
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
  const activeConnections = Array.from(connections.values()).filter(conn => conn.isActive);
  console.log(`📡 Broadcasting ${type} event to ${activeConnections.length} active connections`);
  
  if (activeConnections.length === 0) {
    console.log(`⚠️ No active connections to broadcast to!`);
    return;
  }
  
  const encoder = new TextEncoder();
  const eventData = {
    type,
    data,
    timestamp: new Date().toISOString()
  };
  
  const message = `data: ${JSON.stringify(eventData)}\n\n`;
  
  // Send to all active connections
  let successCount = 0;
  let failureCount = 0;
  
  activeConnections.forEach((connection) => {
    const connectionId = Array.from(connections.entries()).find(([_, conn]) => conn === connection)?.[0];
    if (!connectionId) return;
    
    try {
      // Check if controller is still writable
      if (connection.controller.desiredSize === null) {
        // Remove failed connection immediately
        connections.delete(connectionId);
        failureCount++;
        return;
      }
      
      connection.controller.enqueue(encoder.encode(message));
      connection.lastActivity = new Date();
      successCount++;
    } catch (error) {
      // Remove failed connection immediately
      connections.delete(connectionId);
      failureCount++;
    }
  });
  
  console.log(`📡 Broadcast complete: ${successCount} successful, ${failureCount} removed`);
}