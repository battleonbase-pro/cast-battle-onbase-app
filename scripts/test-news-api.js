import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function testNewsAPI() {
  console.log('📰 Testing NewsAPI integration...\n');

  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey || apiKey === 'your_news_api_key_here') {
    console.log('❌ Please set your NEWS_API_KEY in the .env file');
    console.log('   1. Go to: https://newsapi.org/');
    console.log('   2. Sign up for a free account');
    console.log('   3. Copy your API key');
    console.log('   4. Add it to your .env file\n');
    return;
  }

  try {
    console.log('🔍 Testing NewsAPI endpoints...\n');

    // Test 1: World News
    console.log('1️⃣ Testing World News...');
    const worldNewsResponse = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        apiKey: apiKey,
        country: 'us',
        pageSize: 5
      }
    });

    if (worldNewsResponse.data.status === 'ok') {
      console.log(`   ✅ World News: ${worldNewsResponse.data.totalResults} articles found`);
      console.log(`   📰 Sample: ${worldNewsResponse.data.articles[0]?.title || 'No articles'}`);
    } else {
      console.log('   ❌ World News failed');
    }

    // Test 2: Politics News
    console.log('\n2️⃣ Testing Politics News...');
    const politicsResponse = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        apiKey: apiKey,
        country: 'us',
        category: 'politics',
        pageSize: 5
      }
    });

    if (politicsResponse.data.status === 'ok') {
      console.log(`   ✅ Politics News: ${politicsResponse.data.totalResults} articles found`);
      console.log(`   📰 Sample: ${politicsResponse.data.articles[0]?.title || 'No articles'}`);
    } else {
      console.log('   ❌ Politics News failed');
    }

    // Test 3: Crypto News
    console.log('\n3️⃣ Testing Crypto News...');
    const cryptoResponse = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        apiKey: apiKey,
        q: 'cryptocurrency OR bitcoin OR ethereum',
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 5
      }
    });

    if (cryptoResponse.data.status === 'ok') {
      console.log(`   ✅ Crypto News: ${cryptoResponse.data.totalResults} articles found`);
      console.log(`   📰 Sample: ${cryptoResponse.data.articles[0]?.title || 'No articles'}`);
    } else {
      console.log('   ❌ Crypto News failed');
    }

    console.log('\n✅ NewsAPI integration test complete!');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Test AI agents: npm run test:agents');
    console.log('   2. Start development: npm run dev');
    console.log('   3. Visit: http://localhost:3000');

  } catch (error) {
    console.error('\n❌ Error testing NewsAPI:', error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check your NEWS_API_KEY is correct');
      console.log('   2. Verify the key is active at https://newsapi.org/');
      console.log('   3. Check if you have exceeded rate limits');
    } else if (error.response?.status === 426) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. You may have exceeded the free tier limit');
      console.log('   2. Consider upgrading your NewsAPI plan');
      console.log('   3. Wait for the rate limit to reset');
    } else {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify your NEWS_API_KEY');
      console.log('   3. Check NewsAPI service status');
    }
  }
}

// Run the test
testNewsAPI();
