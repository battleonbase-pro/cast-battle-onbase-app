import { initializeServer } from '@/lib/server-init';

/**
 * Server-side initialization component
 * This ensures the battle manager starts automatically when the server starts
 */
export default async function ServerInitializer() {
  try {
    await initializeServer();
  } catch (error) {
    console.error('Failed to initialize server:', error);
  }
  
  return null; // This component doesn't render anything
}
