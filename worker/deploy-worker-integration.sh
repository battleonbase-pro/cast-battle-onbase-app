#!/bin/bash

# Deploy Worker with On-Chain Integration
# This script deploys the worker service with the new on-chain debate integration

set -e

echo "🚀 Deploying Worker with On-Chain Integration"
echo "=============================================="

# Configuration
PROJECT_ID="battle-worker-phraseflow"
SERVICE_NAME="worker"
REGION="us-central1"
REPOSITORY="newscast-debate-repo"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}"

echo "📋 Configuration:"
echo "   Project: ${PROJECT_ID}"
echo "   Service: ${SERVICE_NAME}"
echo "   Region: ${REGION}"
echo "   Image: ${IMAGE_NAME}"

# Check if we're in the worker directory
if [ ! -f "package.json" ] || [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Must be run from the worker directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: package.json, Dockerfile"
    exit 1
fi

echo ""
echo "🔧 Step 1: Building Docker Image"
echo "================================"

# Build the Docker image
echo "Building Docker image for AMD64 platform..."
docker buildx build --platform linux/amd64 -t ${IMAGE_NAME} .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo "✅ Docker image built successfully"

echo ""
echo "🔧 Step 2: Pushing to Artifact Registry"
echo "========================================"

# Configure Docker to use gcloud as a credential helper for Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Push the image
echo "Pushing image to Artifact Registry..."
docker push ${IMAGE_NAME}

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed"
    exit 1
fi

echo "✅ Image pushed successfully"

echo ""
echo "🔧 Step 3: Deploying to Cloud Run"
echo "================================="

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --timeout 3600 \
    --max-instances 10 \
    --port 3001 \
    --set-env-vars "NODE_ENV=production" \
    --quiet

if [ $? -ne 0 ]; then
    echo "❌ Cloud Run deployment failed"
    exit 1
fi

echo "✅ Service deployed successfully"

echo ""
echo "🔧 Step 4: Getting Service URL"
echo "=============================="

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format="value(status.url)")

echo "✅ Service URL: ${SERVICE_URL}"

echo ""
echo "🔧 Step 5: Testing Integration"
echo "=============================="

# Test the service
echo "Testing service health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/health" || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Service is healthy"
else
    echo "⚠️  Service health check returned: ${HEALTH_RESPONSE}"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "Service URL: ${SERVICE_URL}"
echo ""
echo "📝 Integration Features Deployed:"
echo "   ✅ On-chain debate creation"
echo "   ✅ Database battle linking"
echo "   ✅ Oracle integration"
echo "   ✅ Automated battle completion"
echo "   ✅ USDC payout system"
echo ""
echo "🔗 Complete Flow:"
echo "   News Topic → On-Chain Debate → Database Battle → Users Join → Battle Ends → AI Judges → Oracle Declares Winner → Contract Pays Out"
echo ""
echo "📊 Next Steps:"
echo "   1. Monitor service logs: gcloud logs tail --service=${SERVICE_NAME} --region=${REGION}"
echo "   2. Test battle creation with new integration"
echo "   3. Verify on-chain debate creation"
echo "   4. Test end-to-end battle completion flow"
echo ""
echo "🔍 Useful Commands:"
echo "   View logs: gcloud logs tail --service=${SERVICE_NAME} --region=${REGION}"
echo "   Service info: gcloud run services describe ${SERVICE_NAME} --region=${REGION}"
echo "   Update env vars: gcloud run services update ${SERVICE_NAME} --region=${REGION} --set-env-vars KEY=VALUE"
