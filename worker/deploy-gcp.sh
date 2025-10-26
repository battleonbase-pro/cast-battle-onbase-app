#!/bin/bash

# Google Cloud Worker Deployment Script
# Usage: ./deploy-gcp.sh [PROJECT_ID] [REGION]

set -e

# Load environment variables from parent .env file if exists
if [ -f ../.env ]; then
    export $(grep -v '^#' ../.env | xargs)
fi

# Configuration
PROJECT_ID=${1:-"battle-worker-phraseflow"}
REGION=${2:-"us-central1"}
SERVICE_NAME="battle-completion-worker"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Contract addresses from environment - REQUIRED
if [ -z "${NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS}" ] || [ -z "${NEXT_PUBLIC_USDC_ADDRESS}" ]; then
    echo "❌ Error: Required environment variables not set!"
    echo "   Please set NEXT_PUBLIC_DEB browned_POOL_CONTRACT_ADDRESS and NEXT_PUBLIC_USDC_ADDRESS in your .env file"
    echo "   These values are required for deployment and cannot have fallbacks"
    exit 1
fi

echo "🚀 Deploying Battle Completion Worker to Google Cloud"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
echo "📋 Setting project..."
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Build and push Docker image
echo "🐳 Building and pushing Docker image..."
gcloud builds submit --tag ${IMAGE_NAME} .

# Create secrets if they don't exist
echo "🔐 Setting up secrets..."
gcloud secrets create battle-worker-secrets --replication-policy="automatic" 2>/dev/null || echo "Secret already exists"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 3001 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 10 \
    --timeout 3600 \
    --set-env-vars NODE_ENV=production,NEWS_SOURCE=serper,NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS=${NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS},NEXT_PUBLIC_USDC_ADDRESS=${NEXT_PUBLIC_USDC_ADDRESS},NEXT_PUBLIC_NETWORK=testnet,BATTLE_DURATION_HOURS=4 \
    --set-secrets DATABASE_URL=database-url:latest,GOOGLE_GENERATIVE_AI_API_KEY=google-generative-ai-api-key:latest,SERPER_API_KEY=serper-api-key:latest,WORKER_API_KEY=battle-worker-secrets:latest,DEBATE_POOL_CONTRACT_ADDRESS=debate-pool-contract-address:latest,ORACLE_PRIVATE_KEY=oracle-private-key:latest,BASE_SEPOLIA_RPC=base-sepolia-rpc:latest

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format="value(status.url)")

echo "✅ Deployment complete!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo "📊 Health check: ${SERVICE_URL}/health"
echo "📈 Status: ${SERVICE_URL}/status"
echo "🔧 Manual trigger: curl -X POST ${SERVICE_URL}/trigger"

# Test the deployment
echo "🧪 Testing deployment..."
sleep 10
curl -f "${SERVICE_URL}/health" && echo "✅ Health check passed!" || echo "❌ Health check failed!"
