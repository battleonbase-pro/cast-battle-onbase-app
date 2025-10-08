import { BattleManagerDB } from './services/battle-manager-db';

let isInitialized = false;

/**
 * Initialize the battle manager on server startup
 * This ensures battles are created automatically even without client connections
 */
export async function initializeServer(): Promise<void> {
  if (isInitialized) {
    console.log('Server already initialized, ensuring battle manager is running...');
    // Still ensure battle manager is initialized even if server was already initialized
    try {
      const battleManager = await BattleManagerDB.getInstance();
      console.log('✅ Battle manager confirmed running');
    } catch (error) {
      console.error('❌ Failed to ensure battle manager is running:', error);
    }
    return;
  }

  try {
    console.log('🚀 Initializing server - starting battle manager...');
    
    // Initialize battle manager which will set up automatic battle creation
    const battleManager = await BattleManagerDB.getInstance();
    
    console.log('✅ Server initialization complete - battle manager is running');
    console.log('📊 Battle manager will create battles automatically every', battleManager.getConfig().battleDurationHours, 'hours');
    
    isInitialized = true;
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    throw error;
  }
}

/**
 * Check if server has been initialized
 */
export function isServerInitialized(): boolean {
  return isInitialized;
}
