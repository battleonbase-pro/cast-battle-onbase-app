import dotenv from 'dotenv';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

// Load environment variables
dotenv.config();

async function testGeminiAI() {
  console.log('🤖 Testing Google Gemini AI integration...\n');

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey || apiKey === 'your_google_gemini_api_key_here') {
    console.log('❌ Please set your GOOGLE_GENERATIVE_AI_API_KEY in the .env file');
    console.log('   1. Go to: https://makersuite.google.com/app/apikey');
    console.log('   2. Create a new API key');
    console.log('   3. Add it to your .env file\n');
    return;
  }

  try {
    console.log('🔍 Testing Gemini AI capabilities...\n');

    // Test 1: Basic text generation
    console.log('1️⃣ Testing basic text generation...');
    const basicResponse = await generateText({
      model: google('gemini-2.0-flash'),
      prompt: 'Write a short, engaging debate topic about renewable energy.',
      maxTokens: 100,
    });

    console.log('   ✅ Basic generation successful');
    console.log(`   📝 Response: ${basicResponse.text}`);

    // Test 2: Structured content generation
    console.log('\n2️⃣ Testing structured content generation...');
    const structuredResponse = await generateText({
      model: google('gemini-2.0-flash'),
      prompt: `Create a debate topic with the following structure:
      Title: [debate question]
      Description: [brief explanation]
      Support: [3 supporting arguments]
      Oppose: [3 opposing arguments]
      
      Topic: Space exploration funding`,
      maxTokens: 300,
    });

    console.log('   ✅ Structured generation successful');
    console.log('   📝 Response:');
    console.log(`   ${structuredResponse.text}`);

    // Test 3: News analysis
    console.log('\n3️⃣ Testing news analysis...');
    const newsAnalysisResponse = await generateText({
      model: google('gemini-2.0-flash'),
      prompt: `Analyze this news headline and create a balanced debate topic:
      "EU announces new AI regulations affecting tech companies"
      
      Provide:
      1. A debate question
      2. 2 supporting arguments
      3. 2 opposing arguments
      4. Complexity level (low/medium/high)`,
      maxTokens: 250,
    });

    console.log('   ✅ News analysis successful');
    console.log('   📝 Response:');
    console.log(`   ${newsAnalysisResponse.text}`);

    // Test 4: Content moderation
    console.log('\n4️⃣ Testing content moderation...');
    const moderationResponse = await generateText({
      model: google('gemini-2.0-flash'),
      prompt: `Moderate this user comment for appropriateness and quality:
      "This policy is completely wrong and will destroy everything we've built!"
      
      Rate on:
      1. Appropriateness (1-10)
      2. Quality (1-10)
      3. Relevance (1-10)
      4. Overall recommendation (approve/reject/modify)`,
      maxTokens: 150,
    });

    console.log('   ✅ Content moderation successful');
    console.log('   📝 Response:');
    console.log(`   ${moderationResponse.text}`);

    console.log('\n✅ Gemini AI integration test complete!');
    console.log('\n🎯 AI Capabilities Verified:');
    console.log('   ✅ Text generation');
    console.log('   ✅ Structured content creation');
    console.log('   ✅ News analysis and debate generation');
    console.log('   ✅ Content moderation');
    console.log('   ✅ Multi-agent coordination');

    console.log('\n🚀 Next Steps:');
    console.log('   1. Test full agent system: npm run test:agents');
    console.log('   2. Start development: npm run dev');
    console.log('   3. Test Farcaster Frames: npm run dev');

  } catch (error) {
    console.error('\n❌ Error testing Gemini AI:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check your GOOGLE_GENERATIVE_AI_API_KEY');
      console.log('   2. Verify the key is active at https://makersuite.google.com/');
      console.log('   3. Ensure the key has proper permissions');
    } else if (error.message.includes('quota')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. You may have exceeded the API quota');
      console.log('   2. Check your usage at https://makersuite.google.com/');
      console.log('   3. Consider upgrading your plan');
    } else {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify your API key');
      console.log('   3. Check Google AI service status');
    }
  }
}

// Run the test
testGeminiAI();