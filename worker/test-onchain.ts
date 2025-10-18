// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { createOnChainDebateService } from './lib/services/onchain-debate-service';

async function testOnChainService() {
  try {
    console.log("🔍 Testing OnChain Service...");
    
    // Debug environment variables
    console.log("Environment variables:");
    console.log(`ORACLE_PRIVATE_KEY: ${process.env.ORACLE_PRIVATE_KEY ? 'SET' : 'NOT SET'} (length: ${process.env.ORACLE_PRIVATE_KEY?.length || 0})`);
    console.log(`DEBATE_POOL_CONTRACT_ADDRESS: ${process.env.DEBATE_POOL_CONTRACT_ADDRESS ? 'SET' : 'NOT SET'} (value: ${process.env.DEBATE_POOL_CONTRACT_ADDRESS})`);
    console.log(`BASE_SEPOLIA_RPC: ${process.env.BASE_SEPOLIA_RPC ? 'SET' : 'NOT SET'} (value: ${process.env.BASE_SEPOLIA_RPC})`);
    
    const service = createOnChainDebateService();
    console.log("✅ OnChain service created successfully");
    
    console.log("🔍 Checking service readiness...");
    const isReady = service.isReady();
    console.log(`Service ready: ${isReady}`);
    
    if (isReady) {
      const oracleAddress = service.getOracleAddress();
      console.log(`Oracle address: ${oracleAddress}`);
      
      console.log("🔍 Testing getActiveDebates...");
      const activeDebates = await service.getActiveDebates();
      console.log(`Active debates: ${activeDebates.length}`);
      console.log(`Debate IDs: ${activeDebates.join(', ')}`);
    }
    
    console.log("✅ OnChain service test completed successfully");
    
  } catch (error) {
    console.error("❌ OnChain service test failed:", error);
  }
}

testOnChainService()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
