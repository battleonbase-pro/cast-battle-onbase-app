 #!/bin/bash

# Exit on any command failure
set -e

# Load environment variables from .env file
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    echo "⚠️  Warning: .env file not found"
fi

# GCP Configuration
PROJECT_ID="battle-worker-phraseflow"
SERVICE_NAME="news-debate-app"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Contract addresses from environment - REQUIRED
if [ -z "${NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS}" ] || [ -z "${NEXT_PUBLIC_USDC_ADDRESS}" ] || [ -z "${NEXT_PUBLIC_ENTRY_POINT_ADDRESS}" ]; then
    echo "❌ Error: Required environment variables not set!"
    echo "   Please set NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS, NEXT_PUBLIC_USDC_ADDRESS, and NEXT_PUBLIC_ENTRY_POINT_ADDRESS in your .env file"
    echo "   These values are required for deployment and cannot have fallbacks"
    exit 1
fi

echo "🚀 Deploying Next.js Frontend to Google Cloud Run"
echo "Project ID: ${PROJECT_ID}"
echo "Service Name: ${SERVICE_NAME}"
echo "Region: ${REGION}"
echo "Image: ${IMAGE_NAME}"
echo "Contract Address (Debate Pool): ${NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS}"
echo "USDC Address: ${NEXT_PUBLIC_USDC_ADDRESS}"

# First, test the build locally to ensure it works
echo "🔍 Testing build locally before Docker build..."
if ! npm run build; then
    echo "❌ Local build failed! Aborting deployment."
    echo "Please fix build errors before deploying."
    exit 1
fi
echo "✅ Local build successful!"

# Build the Docker image
echo "📦 Building Docker image..."
if ! docker buildx build --platform linux/amd64 \
    --build-arg NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS=${NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS} \
    --build-arg NEXT_PUBLIC_USDC_ADDRESS=${NEXT_PUBLIC_USDC_ADDRESS} \
    --build-arg NEXT_PUBLIC_ENTRY_POINT_ADDRESS=${NEXT_PUBLIC_ENTRY_POINT_ADDRESS} \
    --build-arg NEXT_PUBLIC_NETWORK=testnet \
    --build-arg NEXT_PUBLIC_PROJECT_NAME=cast-battle-onbase \
    --build-arg NEWS_SOURCE=serper \
    --build-arg BATTLE_GENERATION_ENABLED=true \
    --build-arg BATTLE_DURATION_HOURS=4 \
    --build-arg BATTLE_MAX_PARTICIPANTS=100 \
    -t ${IMAGE_NAME} --load .; then
    echo "❌ Docker build failed! Aborting deployment."
    exit 1
fi
echo "✅ Docker build successful!"

# Push the image to Google Container Registry
echo "📤 Pushing image to Google Container Registry..."
if ! docker push ${IMAGE_NAME}; then
    echo "❌ Docker push failed! Aborting deployment."
    exit 1
fi
echo "✅ Docker push successful!"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
if ! gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 3000 \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 3600 \
    --set-env-vars NODE_ENV=production,NEXT_PUBLIC_PROJECT_NAME=cast-battle-onbase,NEWS_SOURCE=serper,BATTLE_GENERATION_ENABLED=true,BATTLE_DURATION_HOURS=4,BATTLE_MAX_PARTICIPANTS=100,NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS=${NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS},NEXT_PUBLIC_USDC_ADDRESS=${NEXT_PUBLIC_USDC_ADDRESS},NEXT_PUBLIC_ENTRY_POINT_ADDRESS=${NEXT_PUBLIC_ENTRY_POINT_ADDRESS},NEXT_PUBLIC_NETWORK=testnet,NEXT_PUBLIC_ONCHAINKIT_API_KEY=iLo6nW8uHzW3B59QVnOvIfUNeIwca99k,NEXT_PUBLIC_API_URL=https://news-debate-app-3lducklitq-uc.a.run.app/api,NEXT_PUBLIC_FRAME_URL=https://news-debate-app-3lducklitq-uc.a.run.app/api/frame \
    --set-secrets DATABASE_URL=database-url:latest,WORKER_BASE_URL=worker-base-url:latest,WORKER_API_KEY=worker-api-key:latest,GOOGLE_GENERATIVE_AI_API_KEY=google-generative-ai-api-key:latest,SERPER_API_KEY=serper-api-key:latest,NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=walletconnect-project-id:latest; then
    echo "❌ Cloud Run deployment failed!"
    exit 1
fi
echo "✅ Cloud Run deployment successful!"

echo "✅ Deployment complete!"

# Get the actual service URL from the deployment
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format="value(status.url)" 2>/dev/null || echo "")
if [ -n "$SERVICE_URL" ]; then
    echo "🌐 Service URL: ${SERVICE_URL}"
else
    echo "⚠️  Service URL not available - check deployment status"
fi
