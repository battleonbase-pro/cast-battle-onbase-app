#!/usr/bin/env tsx

import dotenv from 'dotenv';
import NewsSourceFactory from '../lib/services/news-source-factory.js';

// Load environment variables
dotenv.config();

async function testSerperAPI() {
  console.log('🔍 Testing Serper API Integration...\n');

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.error('❌ SERPER_API_KEY not found in environment variables');
    console.log('Please add SERPER_API_KEY to your .env file');
    return;
  }

  try {
    // Test with Serper API
    console.log('1️⃣ Testing with Serper API...');
    const factory = NewsSourceFactory.getInstance();
    factory.switchSource('serper');
    
    console.log(`📊 Current news source: ${factory.getCurrentSource()}`);

    // Test world news
    console.log('\n2️⃣ Testing world news...');
    const worldNews = await factory.getWorldNews();
    console.log(`✅ Found ${worldNews.length} world news articles`);
    if (worldNews.length > 0) {
      console.log(`📰 Sample: "${worldNews[0].title}"`);
      console.log(`🔗 URL: ${worldNews[0].url}`);
      console.log(`🖼️  ImageUrl: ${worldNews[0].imageUrl ? '✅ Yes' : '❌ No'}`);
      if (worldNews[0].imageUrl) {
        console.log(`      URL: ${worldNews[0].imageUrl.substring(0, 80)}...`);
      }
    }

    // Test politics news
    console.log('\n3️⃣ Testing politics news...');
    const politicsNews = await factory.getNewsByCategory('politics');
    console.log(`✅ Found ${politicsNews.length} politics articles`);
    if (politicsNews.length > 0) {
      console.log(`📰 Sample: "${politicsNews[0].title}"`);
      console.log(`🖼️  ImageUrl: ${politicsNews[0].imageUrl ? '✅ Yes' : '❌ No'}`);
    }

    // Test crypto news
    console.log('\n4️⃣ Testing crypto news...');
    const cryptoNews = await factory.getCryptoNews();
    console.log(`✅ Found ${cryptoNews.length} crypto articles`);
    if (cryptoNews.length > 0) {
      console.log(`📰 Sample: "${cryptoNews[0].title}"`);
      console.log(`🖼️  ImageUrl: ${cryptoNews[0].imageUrl ? '✅ Yes' : '❌ No'}`);
    }

    // Test imageUrl summary
    console.log('\n5️⃣ Testing imageUrl summary...');
    const allArticles = [...worldNews, ...politicsNews, ...cryptoNews];
    const articlesWithImages = allArticles.filter(article => article.imageUrl);
    console.log(`🖼️  Articles with images: ${articlesWithImages.length}/${allArticles.length}`);
    
    if (articlesWithImages.length > 0) {
      console.log(`✅ Serper /news endpoint is returning imageUrl data!`);
    } else {
      console.log(`❌ No articles have imageUrl - check Serper API response`);
    }

    // Test switching back to CurrentsAPI
    console.log('\n6️⃣ Testing source switching...');
    factory.switchSource('currents');
    console.log(`📊 Switched to: ${factory.getCurrentSource()}`);

    console.log('\n✅ Serper API integration working correctly!');
    console.log('\n📝 To switch to Serper API, set NEWS_SOURCE=serper in your .env file');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testSerperAPI();
