import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function testNewsAPI() {
  console.log('📰 Testing News API Integration...\n');

  const apiKey = process.env.CURRENTS_API_KEY;

  if (!apiKey || apiKey === 'your_news_api_key_here') {
    console.log('❌ Please set your CURRENTS_API_KEY in the .env file');
    console.log('   1. Go to: https://currentsapi.services/');
    console.log('   2. Sign up for a free account');
    console.log('   3. Get your API key from the dashboard');
    console.log('   4. Add it to your .env file\n');
    return;
  }

  try {
    console.log('1️⃣ Testing News API connection...');
    
    // Test general news endpoint
    const response = await axios.get('https://api.currentsapi.services/v1/latest-news', {
      params: {
        apiKey: apiKey,
        country: 'us',
        pageSize: 5
      }
    });

    if (response.data.status === 'ok') {
      console.log('✅ Currents API connection successful');
      console.log(`   Articles fetched: ${response.data.news.length}`);
    } else {
      throw new Error(`API returned status: ${response.data.status}`);
    }

    console.log('\n2️⃣ Testing politics and crypto news...');
    
    // Test politics news
    const politicsResponse = await axios.get('https://api.currentsapi.services/v1/latest-news', {
      params: {
        apiKey: apiKey,
        category: 'politics',
        country: 'us',
        pageSize: 3
      }
    });

    console.log(`✅ Politics news: ${politicsResponse.data.news.length} articles`);

    // Test crypto news (using search)
    const cryptoResponse = await axios.get('https://api.currentsapi.services/v1/search', {
      params: {
        apiKey: apiKey,
        keywords: 'bitcoin ethereum crypto',
        sortBy: 'published',
        pageSize: 3
      }
    });

    console.log(`✅ Crypto news: ${cryptoResponse.data.news.length} articles`);

    console.log('\n3️⃣ Sample articles:');
    console.log('\n📰 Politics Articles:');
    politicsResponse.data.news.forEach((article, index) => {
      console.log(`   ${index + 1}. ${article.title}`);
      console.log(`      Author: ${article.author}`);
      console.log(`      Published: ${new Date(article.published).toLocaleDateString()}`);
    });

    console.log('\n💰 Crypto Articles:');
    cryptoResponse.data.news.forEach((article, index) => {
      console.log(`   ${index + 1}. ${article.title}`);
      console.log(`      Author: ${article.author}`);
      console.log(`      Published: ${new Date(article.published).toLocaleDateString()}`);
    });

    console.log('\n✅ News API Test Complete!');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Run: npm run test:agents');
    console.log('   2. Test the full system: npm run dev');
    console.log('   3. Check battle topic generation');

  } catch (error) {
    console.error('\n❌ Error testing News API:', error.message);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your CURRENTS_API_KEY');
    console.log('   2. Verify API key permissions');
    console.log('   3. Check your internet connection');
    console.log('   4. Ensure you have remaining API quota');
  }
}

// Run the test
testNewsAPI();