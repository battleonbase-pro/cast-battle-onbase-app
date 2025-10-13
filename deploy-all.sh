#!/bin/bash

# Master Deployment Script for News Debate Platform
# Deploys both Worker and Frontend services to Google Cloud Run

set -e  # Exit on any error

# Configuration
PROJECT_ID="battle-worker-phraseflow"
REGION="us-central1"
WORKER_SERVICE_NAME="battle-completion-worker"
FRONTEND_SERVICE_NAME="news-debate-app"

echo "🚀 Starting End-to-End Deployment for News Debate Platform"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "=========================================="

# Function to check if gcloud is authenticated
check_auth() {
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        echo "❌ Not authenticated with gcloud. Please run: gcloud auth login"
        exit 1
    fi
    echo "✅ gcloud authentication verified"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker Desktop"
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to deploy worker
deploy_worker() {
    echo ""
    echo "🔧 Deploying Worker Service..."
    echo "=========================================="
    
    cd worker
    
    # Check if worker deployment script exists
    if [ ! -f "deploy-gcp.sh" ]; then
        echo "❌ Worker deployment script not found!"
        exit 1
    fi
    
    # Make script executable and run it
    chmod +x deploy-gcp.sh
    ./deploy-gcp.sh
    
    echo "✅ Worker deployment completed"
    cd ..
}

# Function to deploy frontend
deploy_frontend() {
    echo ""
    echo "🌐 Deploying Frontend Service..."
    echo "=========================================="
    
    # Check if frontend deployment script exists
    if [ ! -f "deploy-frontend-gcp.sh" ]; then
        echo "❌ Frontend deployment script not found!"
        exit 1
    fi
    
    # Make script executable and run it
    chmod +x deploy-frontend-gcp.sh
    ./deploy-frontend-gcp.sh
    
    echo "✅ Frontend deployment completed"
}

# Function to verify deployments
verify_deployments() {
    echo ""
    echo "🔍 Verifying Deployments..."
    echo "=========================================="
    
    # Check worker service
    echo "Checking Worker Service..."
    WORKER_URL=$(gcloud run services describe ${WORKER_SERVICE_NAME} --region=${REGION} --format="value(status.url)" 2>/dev/null || echo "")
    if [ -n "$WORKER_URL" ]; then
        echo "✅ Worker Service: ${WORKER_URL}"
    else
        echo "❌ Worker Service not found"
    fi
    
    # Check frontend service
    echo "Checking Frontend Service..."
    FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE_NAME} --region=${REGION} --format="value(status.url)" 2>/dev/null || echo "")
    if [ -n "$FRONTEND_URL" ]; then
        echo "✅ Frontend Service: ${FRONTEND_URL}"
    else
        echo "❌ Frontend Service not found"
    fi
    
    echo ""
    echo "🎉 Deployment Summary:"
    echo "=========================================="
    echo "Worker Service:   ${WORKER_URL:-'Not deployed'}"
    echo "Frontend Service: ${FRONTEND_URL:-'Not deployed'}"
    echo ""
    echo "🔗 Access your application at: ${FRONTEND_URL:-'Frontend not deployed'}"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --worker-only     Deploy only the worker service"
    echo "  --frontend-only   Deploy only the frontend service"
    echo "  --verify-only     Only verify existing deployments"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy both services"
    echo "  $0 --worker-only      # Deploy only worker"
    echo "  $0 --frontend-only   # Deploy only frontend"
    echo "  $0 --verify-only      # Check deployment status"
}

# Main execution
main() {
    # Parse command line arguments
    case "${1:-}" in
        --worker-only)
            check_auth
            check_docker
            deploy_worker
            verify_deployments
            ;;
        --frontend-only)
            check_auth
            check_docker
            deploy_frontend
            verify_deployments
            ;;
        --verify-only)
            check_auth
            verify_deployments
            ;;
        --help)
            show_usage
            exit 0
            ;;
        "")
            # Deploy both services
            check_auth
            check_docker
            deploy_worker
            deploy_frontend
            verify_deployments
            ;;
        *)
            echo "❌ Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
