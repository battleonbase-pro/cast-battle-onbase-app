import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function testNewsAPI() {
  console.log('📰 Testing News API Integration...\n');

  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey || apiKey === 'your_news_api_key_here') {
    console.log('❌ Please set your NEWS_API_KEY in the .env file');
    console.log('   1. Go to: https://newsapi.org/');
    console.log('   2. Sign up for a free account');
    console.log('   3. Get your API key from the dashboard');
    console.log('   4. Add it to your .env file\n');
    return;
  }

  try {
    console.log('1️⃣ Testing News API connection...');
    
    // Test general news endpoint
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        apiKey: apiKey,
        country: 'us',
        pageSize: 5
      }
    });

    if (response.data.status === 'ok') {
      console.log('✅ News API connection successful');
      console.log(`   Total articles available: ${response.data.totalResults}`);
      console.log(`   Articles fetched: ${response.data.articles.length}`);
    } else {
      throw new Error(`API returned status: ${response.data.status}`);
    }

    console.log('\n2️⃣ Testing politics and crypto news...');
    
    // Test politics news
    const politicsResponse = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        apiKey: apiKey,
        category: 'politics',
        country: 'us',
        pageSize: 3
      }
    });

    console.log(`✅ Politics news: ${politicsResponse.data.articles.length} articles`);

    // Test crypto news (using search)
    const cryptoResponse = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        apiKey: apiKey,
        q: 'cryptocurrency OR bitcoin OR ethereum',
        sortBy: 'publishedAt',
        pageSize: 3
      }
    });

    console.log(`✅ Crypto news: ${cryptoResponse.data.articles.length} articles`);

    console.log('\n3️⃣ Sample articles:');
    console.log('\n📰 Politics Articles:');
    politicsResponse.data.articles.forEach((article, index) => {
      console.log(`   ${index + 1}. ${article.title}`);
      console.log(`      Source: ${article.source.name}`);
      console.log(`      Published: ${new Date(article.publishedAt).toLocaleDateString()}`);
    });

    console.log('\n💰 Crypto Articles:');
    cryptoResponse.data.articles.forEach((article, index) => {
      console.log(`   ${index + 1}. ${article.title}`);
      console.log(`      Source: ${article.source.name}`);
      console.log(`      Published: ${new Date(article.publishedAt).toLocaleDateString()}`);
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
    console.log('   1. Check your NEWS_API_KEY');
    console.log('   2. Verify API key permissions');
    console.log('   3. Check your internet connection');
    console.log('   4. Ensure you have remaining API quota');
  }
}

// Run the test
testNewsAPI();