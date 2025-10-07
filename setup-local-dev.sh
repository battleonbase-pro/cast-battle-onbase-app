#!/bin/bash

# NewsCast Debate - Local Development Setup Script
# This script sets up PostgreSQL in Docker for local development

echo "🚀 Setting up NewsCast Debate local development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# Local Development Environment Variables
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/newscast_debate?sslmode=disable"

# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_alchemy_api_key_here

# News API Configuration
CURRENTS_API_KEY=your_currents_api_key_here
SERPER_API_KEY=your_serper_api_key_here
NEWS_SOURCE=serper

# AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here

# Battle Configuration
BATTLE_DURATION_HOURS=0.05
BATTLE_MAX_PARTICIPANTS=1000

# Project Configuration
NEXT_PUBLIC_PROJECT_NAME="newscast-debate-local"
EOF
    echo "✅ Created .env.local file"
else
    echo "✅ .env.local already exists"
fi

# Start PostgreSQL container
echo "🐘 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is running
if docker-compose ps postgres | grep -q "Up"; then
    echo "✅ PostgreSQL is running!"
    echo "📊 Database Details:"
    echo "   Host: localhost"
    echo "   Port: 5432"
    echo "   Database: newscast_debate"
    echo "   Username: postgres"
    echo "   Password: postgres123"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Run: npm run db:migrate"
    echo "   2. Run: npm run dev"
    echo ""
    echo "🛑 To stop PostgreSQL: docker-compose down"
else
    echo "❌ Failed to start PostgreSQL. Check Docker logs:"
    docker-compose logs postgres
    exit 1
fi
