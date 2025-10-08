#!/bin/bash

# Railway deployment script for Battle Completion Worker
# This script helps set up the worker service on Railway

echo "🚀 Setting up Battle Completion Worker for Railway deployment..."

# Check if we're in the worker directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the worker/ directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check environment variables
echo "🔍 Checking environment variables..."
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set"
fi

if [ -z "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
    echo "⚠️  GOOGLE_GENERATIVE_AI_API_KEY not set"
fi

if [ -z "$SERPER_API_KEY" ]; then
    echo "⚠️  SERPER_API_KEY not set"
fi

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables on Railway:"
echo "   - DATABASE_URL"
echo "   - GOOGLE_GENERATIVE_AI_API_KEY"
echo "   - SERPER_API_KEY"
echo ""
echo "2. Deploy to Railway:"
echo "   - Connect your GitHub repo"
echo "   - Select worker/ directory"
echo "   - Deploy"
echo ""
echo "3. Monitor logs to ensure worker is running correctly"
