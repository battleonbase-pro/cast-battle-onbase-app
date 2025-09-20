import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function setupGeminiEnvironment() {
  console.log('🤖 Setting up Google Gemini AI environment...\n');
  
  const envPath = path.join(__dirname, '..', '.env');
  
  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found. Please run: npm run setup:env');
    return;
  }
  
  // Read current .env content
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if GOOGLE_GENERATIVE_AI_API_KEY is already set
  if (envContent.includes('GOOGLE_GENERATIVE_AI_API_KEY=') && 
      !envContent.includes('GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_api_key_here')) {
    console.log('✅ GOOGLE_GENERATIVE_AI_API_KEY is already configured');
    console.log('🧪 Test with: npm run test:agents\n');
    return;
  }
  
  console.log('📝 Please add your Google Gemini API key to .env file:');
  console.log('   GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here\n');
  
  console.log('🔗 Get your API key:');
  console.log('   1. Go to: https://makersuite.google.com/app/apikey');
  console.log('   2. Sign in with your Google account');
  console.log('   3. Click "Create API Key"');
  console.log('   4. Copy the generated key');
  console.log('   5. Add it to your .env file\n');
  
  console.log('🧪 After adding the key, test with:');
  console.log('   npm run test:agents\n');
  
  console.log('📚 Features enabled with Gemini:');
  console.log('   ✅ News curation and filtering');
  console.log('   ✅ Debate topic generation');
  console.log('   ✅ Content moderation');
  console.log('   ✅ Battle winner selection');
  console.log('   ✅ Quality analysis and scoring\n');
}

// Run setup
setupGeminiEnvironment();
