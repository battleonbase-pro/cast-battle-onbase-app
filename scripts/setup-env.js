#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Setting up Cast Battle OnchainKit project...\n');

// Create .env.local file
const envPath = path.join(__dirname, '..', '.env.local');

const envContent = `# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_alchemy_api_key_here

# News API Configuration
NEWS_API_KEY=your_news_api_key_here

# AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here

# Battle Token Contract Address (will be set after deployment)
NEXT_PUBLIC_BATTLE_TOKEN_ADDRESS=

# API endpoints
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_FRAME_URL=http://localhost:3000/api/frame
`;

fs.writeFileSync(envPath, envContent);
console.log('✅ Created .env.local file');

console.log('\n🔑 Required API Keys:');
console.log('1. Alchemy API Key: https://www.alchemy.com/');
console.log('   - Sign up for free account');
console.log('   - Create new app');
console.log('   - Copy API key to NEXT_PUBLIC_ONCHAINKIT_API_KEY');
console.log('');
console.log('2. News API Key: https://newsapi.org/');
console.log('   - Sign up for free account');
console.log('   - Copy API key to NEWS_API_KEY');
console.log('');
console.log('3. Google AI API Key: https://makersuite.google.com/app/apikey');
console.log('   - Create new API key');
console.log('   - Copy API key to GOOGLE_GENERATIVE_AI_API_KEY');
console.log('');

console.log('🎯 Features:');
console.log('✅ OnchainKit wallet integration');
console.log('✅ Token balance display');
console.log('✅ Transaction handling');
console.log('✅ Battle creation and participation');
console.log('✅ AI-powered topic generation');
console.log('✅ Farcaster Frame integration');
console.log('');

console.log('🚀 Next Steps:');
console.log('1. Add your API keys to .env.local');
console.log('2. Run: npm run dev');
console.log('3. Sign in with Base');
console.log('4. Create and join battles!');
console.log('');

console.log('📚 Documentation:');
console.log('https://docs.base.org/onchainkit/getting-started');
console.log('');
