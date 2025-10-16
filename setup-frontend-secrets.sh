#!/bin/bash

# GCP Configuration
PROJECT_ID="battle-worker-phraseflow"

echo "🔐 Setting up Google Cloud Secrets for Frontend Deployment"
echo "Project ID: ${PROJECT_ID}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with the following variables:"
    echo "  DATABASE_URL=your_database_url"
    echo "  WORKER_BASE_URL=your_worker_base_url"
    echo "  WORKER_API_KEY=your_worker_api_key"
    echo "  GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key"
    echo "  SERPER_API_KEY=your_serper_api_key"
    echo "  WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id"
    exit 1
fi

# Load environment variables from .env file
echo "📁 Loading environment variables from .env file..."
export $(grep -v '^#' .env | xargs)

# Set the project
gcloud config set project ${PROJECT_ID}

# Create secrets for environment variables
echo "📝 Creating secrets..."

# Database URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in .env file"
    exit 1
fi
echo "Creating database-url secret..."
echo "$DATABASE_URL" | gcloud secrets create database-url --data-file=- || echo "Secret database-url already exists"

# Worker Base URL
if [ -z "$WORKER_BASE_URL" ]; then
    echo "❌ Error: WORKER_BASE_URL not found in .env file"
    exit 1
fi
echo "Creating worker-base-url secret..."
echo "$WORKER_BASE_URL" | gcloud secrets create worker-base-url --data-file=- || echo "Secret worker-base-url already exists"

# Worker API Key
if [ -z "$WORKER_API_KEY" ]; then
    echo "❌ Error: WORKER_API_KEY not found in .env file"
    exit 1
fi
echo "Creating worker-api-key secret..."
echo "$WORKER_API_KEY" | gcloud secrets create worker-api-key --data-file=- || echo "Secret worker-api-key already exists"

# Google Generative AI API Key
if [ -z "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
    echo "❌ Error: GOOGLE_GENERATIVE_AI_API_KEY not found in .env file"
    exit 1
fi
echo "Creating google-generative-ai-api-key secret..."
echo "$GOOGLE_GENERATIVE_AI_API_KEY" | gcloud secrets create google-generative-ai-api-key --data-file=- || echo "Secret google-generative-ai-api-key already exists"

# Serper API Key
if [ -z "$SERPER_API_KEY" ]; then
    echo "❌ Error: SERPER_API_KEY not found in .env file"
    exit 1
fi
echo "Creating serper-api-key secret..."
echo "$SERPER_API_KEY" | gcloud secrets create serper-api-key --data-file=- || echo "Secret serper-api-key already exists"

# WalletConnect Project ID
if [ -z "$WALLETCONNECT_PROJECT_ID" ]; then
    echo "❌ Error: WALLETCONNECT_PROJECT_ID not found in .env file"
    exit 1
fi
echo "Creating walletconnect-project-id secret..."
echo "$WALLETCONNECT_PROJECT_ID" | gcloud secrets create walletconnect-project-id --data-file=- || echo "Secret walletconnect-project-id already exists"

echo "✅ Secrets setup complete!"
echo "🔍 Listing all secrets:"
gcloud secrets list
