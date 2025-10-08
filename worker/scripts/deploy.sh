#!/bin/bash

# Battle Completion Worker - Easy Deployment Script
# This script handles the complete deployment process for the worker service

set -e  # Exit on any error

# Configuration
PROJECT_ID="battle-worker-phraseflow"
REGION="us-central1"
SERVICE_NAME="battle-completion-worker"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
API_KEY="92d4cca6-2987-417c-b6bf-36ac4cba6972"
SERVICE_URL="https://${SERVICE_NAME}-733567590021.${REGION}.run.app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if gcloud is installed and authenticated
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "No active gcloud authentication found. Please run 'gcloud auth login'"
        exit 1
    fi
    
    # Check if we're in the correct project
    CURRENT_PROJECT=$(gcloud config get-value project)
    if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
        log_warning "Current project is '$CURRENT_PROJECT', switching to '$PROJECT_ID'"
        gcloud config set project $PROJECT_ID
    fi
    
    log_success "Prerequisites check passed"
}

# Build and push Docker image
build_and_push() {
    log_info "Building and pushing Docker image..."
    
    # Build the image
    log_info "Building Docker image: $IMAGE_NAME"
    gcloud builds submit --tag $IMAGE_NAME .
    
    log_success "Docker image built and pushed successfully"
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
    log_info "Deploying to Cloud Run..."
    
    gcloud run deploy $SERVICE_NAME \
        --image $IMAGE_NAME \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --port 3001 \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 1 \
        --max-instances 10 \
        --timeout 3600 \
        --set-env-vars NODE_ENV=production,NEWS_SOURCE=serper \
        --set-secrets DATABASE_URL=database-url:latest,GOOGLE_GENERATIVE_AI_API_KEY=google-ai-api-key:latest,SERPER_API_KEY=serper-api-key:latest,CURRENTS_API_KEY=currents-api-key:latest,WORKER_API_KEY=worker-api-key:latest
    
    log_success "Deployed to Cloud Run successfully"
}

# Test the deployment
test_deployment() {
    log_info "Testing deployment..."
    
    # Wait a moment for the service to be ready
    sleep 10
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    if curl -s -f "$SERVICE_URL/health" > /dev/null; then
        log_success "Health endpoint is responding"
    else
        log_error "Health endpoint is not responding"
        return 1
    fi
    
    # Test status endpoint with API key
    log_info "Testing status endpoint..."
    if curl -s -f -H "X-API-Key: $API_KEY" "$SERVICE_URL/status" > /dev/null; then
        log_success "Status endpoint is responding"
    else
        log_error "Status endpoint is not responding"
        return 1
    fi
    
    log_success "All tests passed!"
}

# Show deployment info
show_deployment_info() {
    echo ""
    log_success "🚀 Deployment Complete!"
    echo ""
    echo -e "${BLUE}Service Information:${NC}"
    echo "  Service URL: $SERVICE_URL"
    echo "  API Key: $API_KEY"
    echo "  Project: $PROJECT_ID"
    echo "  Region: $REGION"
    echo ""
    echo -e "${BLUE}Quick Test Commands:${NC}"
    echo "  Health Check:"
    echo "    curl -s $SERVICE_URL/health | jq ."
    echo ""
    echo "  Status Check:"
    echo "    curl -s -H \"X-API-Key: $API_KEY\" $SERVICE_URL/status | jq ."
    echo ""
    echo "  View Logs:"
    echo "    gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --limit=20"
    echo ""
}

# Main deployment function
main() {
    echo -e "${BLUE}🚀 Battle Completion Worker Deployment${NC}"
    echo "=============================================="
    
    check_prerequisites
    build_and_push
    deploy_to_cloud_run
    test_deployment
    show_deployment_info
}

# Handle command line arguments
case "${1:-deploy}" in
    "build")
        check_prerequisites
        build_and_push
        ;;
    "deploy")
        main
        ;;
    "test")
        test_deployment
        ;;
    "logs")
        gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" --limit=20 --format="table(timestamp,severity,textPayload)"
        ;;
    "info")
        show_deployment_info
        ;;
    *)
        echo "Usage: $0 [build|deploy|test|logs|info]"
        echo ""
        echo "Commands:"
        echo "  build   - Build and push Docker image only"
        echo "  deploy  - Full deployment (build + deploy + test)"
        echo "  test    - Test the deployed service"
        echo "  logs    - Show recent logs"
        echo "  info    - Show deployment information"
        exit 1
        ;;
esac
