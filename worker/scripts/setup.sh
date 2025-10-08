#!/bin/bash

# Battle Completion Worker - Initial Setup Script
# Run this script once to set up the Google Cloud environment

set -e

# Configuration
PROJECT_ID="battle-worker-phraseflow"
REGION="us-central1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo -e "${BLUE}🔧 Battle Completion Worker - Initial Setup${NC}"
echo "=============================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI is not installed. Please install it first:"
    echo "  https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Authenticate if needed
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    log_warning "No active gcloud authentication found."
    log_info "Please run: gcloud auth login"
    exit 1
fi

# Set project
log_info "Setting project to $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Enable required APIs
log_info "Enabling required Google Cloud APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com

log_success "APIs enabled successfully"

# Create secrets (you'll need to provide the actual values)
log_info "Creating secrets..."

echo ""
log_warning "You need to provide the following values:"
echo "1. DATABASE_URL (PostgreSQL connection string)"
echo "2. GOOGLE_GENERATIVE_AI_API_KEY"
echo "3. SERPER_API_KEY"
echo "4. CURRENTS_API_KEY"
echo "5. WORKER_API_KEY (will use UUID: 92d4cca6-2987-417c-b6bf-36ac4cba6972)"
echo ""

# Get DATABASE_URL
read -p "Enter DATABASE_URL: " DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL is required"
    exit 1
fi

# Get Google AI API Key
read -p "Enter GOOGLE_GENERATIVE_AI_API_KEY: " GOOGLE_AI_KEY
if [ -z "$GOOGLE_AI_KEY" ]; then
    log_error "GOOGLE_GENERATIVE_AI_API_KEY is required"
    exit 1
fi

# Get Serper API Key
read -p "Enter SERPER_API_KEY: " SERPER_KEY
if [ -z "$SERPER_KEY" ]; then
    log_error "SERPER_API_KEY is required"
    exit 1
fi

# Get Currents API Key
read -p "Enter CURRENTS_API_KEY: " CURRENTS_KEY
if [ -z "$CURRENTS_KEY" ]; then
    log_error "CURRENTS_API_KEY is required"
    exit 1
fi

# Use the predefined API key
WORKER_API_KEY="92d4cca6-2987-417c-b6bf-36ac4cba6972"

# Create secrets
log_info "Creating secrets..."

echo -n "$DATABASE_URL" | gcloud secrets create database-url --data-file=-
echo -n "$GOOGLE_AI_KEY" | gcloud secrets create google-ai-api-key --data-file=-
echo -n "$SERPER_KEY" | gcloud secrets create serper-api-key --data-file=-
echo -n "$CURRENTS_KEY" | gcloud secrets create currents-api-key --data-file=-
echo -n "$WORKER_API_KEY" | gcloud secrets create worker-api-key --data-file=-

log_success "Secrets created successfully"

# Grant permissions to the service account
log_info "Setting up IAM permissions..."

SERVICE_ACCOUNT="733567590021-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding database-url --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding google-ai-api-key --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding serper-api-key --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding currents-api-key --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding worker-api-key --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"

log_success "IAM permissions set successfully"

echo ""
log_success "🎉 Setup Complete!"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Run the deployment:"
echo "   npm run deploy"
echo ""
echo "2. Or run individual commands:"
echo "   npm run deploy:build  # Build and push image"
echo "   npm run deploy:run    # Deploy to Cloud Run"
echo "   npm run deploy:full   # Build and deploy"
echo ""
echo "3. Test the deployment:"
echo "   npm run test:health"
echo "   npm run test:status"
echo ""
echo "4. View logs:"
echo "   npm run logs"
echo ""
