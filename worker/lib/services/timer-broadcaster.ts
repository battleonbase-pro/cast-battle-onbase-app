/**
 * Timer Broadcaster Service for Worker
 * Handles real-time timer synchronization to connected clients
 */

// Store active SSE connections
const connections = new Map<string, {
  id: string;
  controller: ReadableStreamDefaultController;
  lastActivity: Date;
  isActive: boolean;
}>();

export function getConnectionCount() {
  return connections.size;
}

export function addTimerConnection(connection: {
  id: string;
  controller: ReadableStreamDefaultController;
}) {
  connections.set(connection.id, {
    ...connection,
    lastActivity: new Date(),
    isActive: true
  });
  const activeCount = Array.from(connections.values()).filter(conn => conn.isActive).length;
  console.log(`⏰ Timer SSE connection added. Active connections: ${activeCount}`);
}

export function removeTimerConnectionById(connectionId: string) {
  const connectionToRemove = connections.get(connectionId);
  if (connectionToRemove) {
    connections.delete(connectionId);
    console.log(`⏰ Timer SSE connection ${connectionId} removed`);
  }
}

export function markTimerConnectionInactive(connectionId: string) {
  const connection = connections.get(connectionId);
  if (connection) {
    connection.isActive = false;
    console.log(`⏰ Timer SSE connection ${connectionId} marked as inactive`);
  }
}

export function broadcastTimerUpdate(timingInfo: {
  battleId: string | null;
  timeRemaining: number;
  endTime: string | null;
  status: string | null;
  title: string | null;
}) {
  const activeConnections = Array.from(connections.values()).filter(conn => conn.isActive);
  console.log(`⏰ Broadcasting timer update to ${activeConnections.length} active connections`);
  
  if (activeConnections.length === 0) {
    console.log(`⚠️ No active timer connections to broadcast to!`);
    return;
  }
  
  const encoder = new TextEncoder();
  const eventData = {
    type: 'TIMER_UPDATE',
    data: timingInfo,
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
  
  console.log(`⏰ Timer broadcast complete: ${successCount} successful, ${failureCount} removed`);
}

export function broadcastBattleTransition(newBattleInfo: {
  battleId: string;
  title: string;
  endTime: string;
  status: string;
}) {
  const activeConnections = Array.from(connections.values()).filter(conn => conn.isActive);
  console.log(`🔄 Broadcasting battle transition to ${activeConnections.length} active connections`);
  
  if (activeConnections.length === 0) {
    console.log(`⚠️ No active timer connections to broadcast to!`);
    return;
  }
  
  const encoder = new TextEncoder();
  const eventData = {
    type: 'BATTLE_TRANSITION',
    data: newBattleInfo,
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
  
  console.log(`🔄 Battle transition broadcast complete: ${successCount} successful, ${failureCount} removed`);
}
