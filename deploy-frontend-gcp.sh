#!/bin/bash

# GCP Configuration
PROJECT_ID="battle-worker-phraseflow"
SERVICE_NAME="news-debate-frontend"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying Next.js Frontend to Google Cloud Run"
echo "Project ID: ${PROJECT_ID}"
echo "Service Name: ${SERVICE_NAME}"
echo "Region: ${REGION}"
echo "Image: ${IMAGE_NAME}"

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t ${IMAGE_NAME} .

# Push the image to Google Container Registry
echo "📤 Pushing image to Google Container Registry..."
docker push ${IMAGE_NAME}

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
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
    --set-env-vars NODE_ENV=production,NEXT_PUBLIC_PROJECT_NAME=cast-battle-onbase,NEWS_SOURCE=serper,BATTLE_GENERATION_ENABLED=true,BATTLE_DURATION_HOURS=4,BATTLE_MAX_PARTICIPANTS=100 \
    --set-secrets DATABASE_URL=database-url:latest,WORKER_BASE_URL=worker-base-url:latest,WORKER_API_KEY=worker-api-key:latest,GOOGLE_GENERATIVE_AI_API_KEY=google-generative-ai-api-key:latest,SERPER_API_KEY=serper-api-key:latest,NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=walletconnect-project-id:latest

echo "✅ Deployment complete!"
echo "🌐 Service URL: https://${SERVICE_NAME}-${PROJECT_ID}.${REGION}.run.app"
