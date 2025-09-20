import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function setupOnchainKitEnvironment() {
  console.log('🔗 Setting up OnchainKit environment...\n');
  
  const envPath = path.join(__dirname, '..', '.env');
  
  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found. Please run: npm run setup:env');
    return;
  }
  
  // Read current .env content
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if OnchainKit API key is already set
  if (envContent.includes('NEXT_PUBLIC_ONCHAINKIT_API_KEY=') && 
      !envContent.includes('NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_alchemy_api_key_here')) {
    console.log('✅ NEXT_PUBLIC_ONCHAINKIT_API_KEY is already configured');
    console.log('🚀 Ready for wallet integration!\n');
    return;
  }
  
  console.log('📝 Please add your Alchemy API key to .env file:');
  console.log('   NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_actual_alchemy_key_here\n');
  
  console.log('🔗 Get your Alchemy API key:');
  console.log('   1. Go to: https://www.alchemy.com/');
  console.log('   2. Sign up for a free account');
  console.log('   3. Create a new app');
  console.log('   4. Select "Base" network');
  console.log('   5. Copy the API key');
  console.log('   6. Add it to your .env file\n');
  
  console.log('🚀 OnchainKit Features:');
  console.log('   ✅ Base wallet connection');
  console.log('   ✅ Multi-wallet support (MetaMask, Coinbase Wallet, WalletConnect)');
  console.log('   ✅ Token balance display');
  console.log('   ✅ Transaction handling');
  console.log('   ✅ Network switching');
  console.log('   ✅ Account management\n');
  
  console.log('🧪 After adding the key:');
  console.log('   1. Run: npm run dev');
  console.log('   2. Visit: http://localhost:3000');
  console.log('   3. Click "Connect Base Wallet"');
  console.log('   4. Test wallet functionality\n');
  
  console.log('📚 OnchainKit Documentation:');
  console.log('   https://docs.base.org/onchainkit/getting-started\n');
}

// Run setup
setupOnchainKitEnvironment();
