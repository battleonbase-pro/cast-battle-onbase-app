import dotenv from 'dotenv';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define schemas for testing
const DebateTopicSchema = z.object({
  title: z.string().describe('The debate question'),
  description: z.string().describe('Brief explanation of the topic'),
  category: z.string().describe('Topic category'),
  debatePoints: z.object({
    Support: z.array(z.string()).describe('Supporting arguments'),
    Oppose: z.array(z.string()).describe('Opposing arguments')
  }),
  complexity: z.enum(['low', 'medium', 'high']).describe('Complexity level'),
  controversyLevel: z.enum(['low', 'medium', 'high']).describe('Controversy level')
});

const ModerationResultSchema = z.object({
  appropriateness: z.number().min(1).max(10).describe('Appropriateness score (1-10)'),
  quality: z.number().min(1).max(10).describe('Content quality score (1-10)'),
  relevance: z.number().min(1).max(10).describe('Relevance score (1-10)'),
  recommendation: z.enum(['approve', 'reject', 'modify']).describe('Overall recommendation: approve, reject, or modify'),
  reasoning: z.string().describe('Brief explanation for the recommendation')
});

async function testVercelAI() {
  console.log('⚡ Testing Vercel AI SDK with structured generation...\n');

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey || apiKey === 'your_google_gemini_api_key_here') {
    console.log('❌ Please set your GOOGLE_GENERATIVE_AI_API_KEY in the .env file');
    console.log('   1. Go to: https://makersuite.google.com/app/apikey');
    console.log('   2. Create a new API key');
    console.log('   3. Add it to your .env file\n');
    return;
  }

  try {
    console.log('🔍 Testing structured content generation...\n');

    // Test 1: Debate Topic Generation with Schema
    console.log('1️⃣ Testing debate topic generation with Zod schema...');
    const debateResult = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: DebateTopicSchema,
      prompt: `Create a balanced debate topic about artificial intelligence regulation. 
      Make it engaging and suitable for a public debate platform.`,
    });

    console.log('   ✅ Debate topic generation successful');
    console.log(`   📝 Title: ${debateResult.object.title}`);
    console.log(`   📝 Description: ${debateResult.object.description}`);
    console.log(`   📝 Category: ${debateResult.object.category}`);
    console.log(`   📝 Complexity: ${debateResult.object.complexity}`);
    console.log(`   📝 Controversy: ${debateResult.object.controversyLevel}`);
    console.log('   📝 Support Arguments:');
    debateResult.object.debatePoints.Support.forEach((point, index) => {
      console.log(`      ${index + 1}. ${point}`);
    });
    console.log('   📝 Oppose Arguments:');
    debateResult.object.debatePoints.Oppose.forEach((point, index) => {
      console.log(`      ${index + 1}. ${point}`);
    });

    // Test 2: Content Moderation with Schema
    console.log('\n2️⃣ Testing content moderation with Zod schema...');
    const moderationResult = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: ModerationResultSchema,
      prompt: `Rate this user comment on a scale of 1-10 for appropriateness, quality, and relevance. Provide a recommendation (approve/reject/modify) and brief reasoning.

      Comment: "I think renewable energy is the future and we should invest more in solar and wind power. The technology is improving rapidly and costs are coming down."
      
      Context: This is for a debate about energy policy.`,
    });

    console.log('   ✅ Content moderation successful');
    console.log(`   📝 Appropriateness: ${moderationResult.object.appropriateness}/10`);
    console.log(`   📝 Quality: ${moderationResult.object.quality}/10`);
    console.log(`   📝 Relevance: ${moderationResult.object.relevance}/10`);
    console.log(`   📝 Recommendation: ${moderationResult.object.recommendation}`);
    console.log(`   📝 Reasoning: ${moderationResult.object.reasoning}`);

    // Test 3: News Analysis
    console.log('\n3️⃣ Testing news analysis...');
    const newsAnalysisResult = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: DebateTopicSchema,
      prompt: `Analyze this news headline and create a debate topic:
      "Federal Reserve announces interest rate changes affecting mortgage rates"
      
      Create a balanced debate suitable for public discussion.`,
    });

    console.log('   ✅ News analysis successful');
    console.log(`   📝 Title: ${newsAnalysisResult.object.title}`);
    console.log(`   📝 Description: ${newsAnalysisResult.object.description}`);
    console.log(`   📝 Category: ${newsAnalysisResult.object.category}`);

    // Test 4: Quality Analysis
    console.log('\n4️⃣ Testing quality analysis...');
    const qualityResult = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: z.object({
        overallScore: z.number().min(1).max(10).describe('Overall quality score'),
        balanceScore: z.number().min(1).max(10).describe('Balance between sides'),
        engagementScore: z.number().min(1).max(10).describe('Engagement potential'),
        analysis: z.string().describe('Detailed analysis')
      }),
      prompt: `Analyze the quality of this debate topic:
      "${debateResult.object.title}"
      
      Consider balance, engagement potential, and overall quality.`,
    });

    console.log('   ✅ Quality analysis successful');
    console.log(`   📝 Overall Score: ${qualityResult.object.overallScore}/10`);
    console.log(`   📝 Balance Score: ${qualityResult.object.balanceScore}/10`);
    console.log(`   📝 Engagement Score: ${qualityResult.object.engagementScore}/10`);
    console.log(`   📝 Analysis: ${qualityResult.object.analysis}`);

    console.log('\n✅ Vercel AI SDK test complete!');
    console.log('\n🎯 Structured Generation Capabilities:');
    console.log('   ✅ Zod schema validation');
    console.log('   ✅ Type-safe object generation');
    console.log('   ✅ Consistent data structures');
    console.log('   ✅ Error handling and validation');
    console.log('   ✅ Multi-agent coordination');

    console.log('\n🚀 Next Steps:');
    console.log('   1. Test full agent system: npm run test:agents');
    console.log('   2. Start development: npm run dev');
    console.log('   3. Deploy contracts: npm run deploy:testnet');

  } catch (error) {
    console.error('\n❌ Error testing Vercel AI SDK:', error.message);
    
    if (error.message.includes('schema')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check Zod schema definitions');
      console.log('   2. Verify schema validation');
      console.log('   3. Check AI response format');
    } else if (error.message.includes('API key')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check your GOOGLE_GENERATIVE_AI_API_KEY');
      console.log('   2. Verify the key is active');
      console.log('   3. Ensure proper permissions');
    } else {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify your API key');
      console.log('   3. Check service status');
    }
  }
}

// Run the test
testVercelAI();
