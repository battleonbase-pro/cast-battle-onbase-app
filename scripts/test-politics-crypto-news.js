import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function testPoliticsCryptoNews() {
  console.log('🏛️ Testing Politics & Crypto News Filtering...\n');

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
    console.log('🔍 Testing high-impact news filtering...\n');

    // Test Politics News
    console.log('1️⃣ Testing Politics News...');
    const politicsResponse = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        apiKey: apiKey,
        country: 'us',
        category: 'politics',
        pageSize: 10
      }
    });

    if (politicsResponse.data.status === 'ok') {
      console.log(`   ✅ Found ${politicsResponse.data.totalResults} politics articles`);
      
      // Filter for high-impact articles
      const highImpactPolitics = politicsResponse.data.articles.filter(article => {
        const title = article.title.toLowerCase();
        const description = article.description?.toLowerCase() || '';
        const content = title + ' ' + description;
        
        return content.includes('election') || 
               content.includes('congress') || 
               content.includes('senate') || 
               content.includes('president') || 
               content.includes('policy') ||
               content.includes('government') ||
               content.includes('legislation');
      });

      console.log(`   🎯 High-impact politics articles: ${highImpactPolitics.length}`);
      highImpactPolitics.slice(0, 3).forEach((article, index) => {
        console.log(`      ${index + 1}. ${article.title}`);
      });
    }

    // Test Crypto News
    console.log('\n2️⃣ Testing Crypto News...');
    const cryptoResponse = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        apiKey: apiKey,
        q: 'cryptocurrency OR bitcoin OR ethereum OR blockchain OR defi',
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 10
      }
    });

    if (cryptoResponse.data.status === 'ok') {
      console.log(`   ✅ Found ${cryptoResponse.data.totalResults} crypto articles`);
      
      // Filter for high-impact crypto articles
      const highImpactCrypto = cryptoResponse.data.articles.filter(article => {
        const title = article.title.toLowerCase();
        const description = article.description?.toLowerCase() || '';
        const content = title + ' ' + description;
        
        return content.includes('regulation') || 
               content.includes('sec') || 
               content.includes('etf') || 
               content.includes('adoption') || 
               content.includes('institutional') ||
               content.includes('policy') ||
               content.includes('ban') ||
               content.includes('legal');
      });

      console.log(`   🎯 High-impact crypto articles: ${highImpactCrypto.length}`);
      highImpactCrypto.slice(0, 3).forEach((article, index) => {
        console.log(`      ${index + 1}. ${article.title}`);
      });
    }

    // Test World News for Global Politics
    console.log('\n3️⃣ Testing Global Politics...');
    const worldResponse = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        apiKey: apiKey,
        sources: 'bbc-news,cnn,reuters',
        pageSize: 10
      }
    });

    if (worldResponse.data.status === 'ok') {
      console.log(`   ✅ Found ${worldResponse.data.totalResults} world articles`);
      
      // Filter for global politics
      const globalPolitics = worldResponse.data.articles.filter(article => {
        const title = article.title.toLowerCase();
        const description = article.description?.toLowerCase() || '';
        const content = title + ' ' + description;
        
        return content.includes('war') || 
               content.includes('conflict') || 
               content.includes('summit') || 
               content.includes('treaty') || 
               content.includes('sanctions') ||
               content.includes('diplomacy') ||
               content.includes('international');
      });

      console.log(`   🌍 Global politics articles: ${globalPolitics.length}`);
      globalPolitics.slice(0, 3).forEach((article, index) => {
        console.log(`      ${index + 1}. ${article.title}`);
      });
    }

    console.log('\n✅ Politics & Crypto News filtering test complete!');
    console.log('\n🎯 This data will be used by the News Curator Agent to:');
    console.log('   • Score articles by engagement potential');
    console.log('   • Filter for high-impact content');
    console.log('   • Generate balanced debate topics');
    console.log('   • Create compelling battle themes');

    console.log('\n🚀 Next Steps:');
    console.log('   1. Test AI agents: npm run test:agents');
    console.log('   2. Start development: npm run dev');

  } catch (error) {
    console.error('\n❌ Error testing politics & crypto news:', error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check your NEWS_API_KEY is correct');
      console.log('   2. Verify the key is active at https://newsapi.org/');
    } else {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify your NEWS_API_KEY');
      console.log('   3. Check NewsAPI service status');
    }
  }
}

// Run the test
testPoliticsCryptoNews();
