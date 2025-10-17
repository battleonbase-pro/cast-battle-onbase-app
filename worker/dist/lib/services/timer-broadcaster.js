"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectionCount = getConnectionCount;
exports.addTimerConnection = addTimerConnection;
exports.removeTimerConnectionById = removeTimerConnectionById;
exports.markTimerConnectionInactive = markTimerConnectionInactive;
exports.broadcastTimerUpdate = broadcastTimerUpdate;
exports.broadcastBattleTransition = broadcastBattleTransition;
const connections = new Map();
function getConnectionCount() {
    return connections.size;
}
function addTimerConnection(connection) {
    connections.set(connection.id, {
        ...connection,
        lastActivity: new Date(),
        isActive: true
    });
    const activeCount = Array.from(connections.values()).filter(conn => conn.isActive).length;
    console.log(`⏰ Timer SSE connection added. Active connections: ${activeCount}`);
}
function removeTimerConnectionById(connectionId) {
    const connectionToRemove = connections.get(connectionId);
    if (connectionToRemove) {
        connections.delete(connectionId);
        console.log(`⏰ Timer SSE connection ${connectionId} removed`);
    }
}
function markTimerConnectionInactive(connectionId) {
    const connection = connections.get(connectionId);
    if (connection) {
        connection.isActive = false;
        console.log(`⏰ Timer SSE connection ${connectionId} marked as inactive`);
    }
}
function broadcastTimerUpdate(timingInfo) {
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
    let successCount = 0;
    let failureCount = 0;
    activeConnections.forEach((connection) => {
        const connectionId = Array.from(connections.entries()).find(([_, conn]) => conn === connection)?.[0];
        if (!connectionId)
            return;
        try {
            if (connection.controller.desiredSize === null) {
                connections.delete(connectionId);
                failureCount++;
                return;
            }
            connection.controller.enqueue(encoder.encode(message));
            connection.lastActivity = new Date();
            successCount++;
        }
        catch (error) {
            connections.delete(connectionId);
            failureCount++;
        }
    });
    console.log(`⏰ Timer broadcast complete: ${successCount} successful, ${failureCount} removed`);
}
function broadcastBattleTransition(newBattleInfo) {
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
    let successCount = 0;
    let failureCount = 0;
    activeConnections.forEach((connection) => {
        const connectionId = Array.from(connections.entries()).find(([_, conn]) => conn === connection)?.[0];
        if (!connectionId)
            return;
        try {
            if (connection.controller.desiredSize === null) {
                connections.delete(connectionId);
                failureCount++;
                return;
            }
            connection.controller.enqueue(encoder.encode(message));
            connection.lastActivity = new Date();
            successCount++;
        }
        catch (error) {
            connections.delete(connectionId);
            failureCount++;
        }
    });
    console.log(`🔄 Battle transition broadcast complete: ${successCount} successful, ${failureCount} removed`);
}
