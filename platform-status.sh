#!/bin/bash

# Quick Reference Script for News Debate Platform
# Common operations and status checks

PROJECT_ID="battle-worker-phraseflow"
REGION="us-central1"
WORKER_SERVICE="battle-completion-worker"
FRONTEND_SERVICE="news-debate-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to show service status
show_status() {
    echo -e "${BLUE}📊 Service Status${NC}"
    echo "=========================================="
    
    # Worker status
    WORKER_URL=$(gcloud run services describe ${WORKER_SERVICE} --region=${REGION} --format="value(status.url)" 2>/dev/null || echo "")
    if [ -n "$WORKER_URL" ]; then
        echo -e "${GREEN}✅ Worker:${NC} ${WORKER_URL}"
    else
        echo -e "${RED}❌ Worker:${NC} Not deployed"
    fi
    
    # Frontend status
    FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --region=${REGION} --format="value(status.url)" 2>/dev/null || echo "")
    if [ -n "$FRONTEND_URL" ]; then
        echo -e "${GREEN}✅ Frontend:${NC} ${FRONTEND_URL}"
    else
        echo -e "${RED}❌ Frontend:${NC} Not deployed"
    fi
    
    echo ""
}

# Function to show recent logs
show_logs() {
    local service=$1
    local lines=${2:-10}
    
    echo -e "${BLUE}📋 Recent Logs for ${service}${NC}"
    echo "=========================================="
    
    gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${service}" --limit ${lines} --format="table(timestamp,severity,textPayload)" 2>/dev/null || echo "No logs found"
    echo ""
}

# Function to show service details
show_details() {
    local service=$1
    
    echo -e "${BLUE}🔍 Service Details for ${service}${NC}"
    echo "=========================================="
    
    gcloud run services describe ${service} --region=${REGION} --format="table(
        metadata.name,
        status.url,
        spec.template.spec.containers[0].image,
        status.conditions[0].status,
        status.conditions[0].message
    )" 2>/dev/null || echo "Service not found"
    echo ""
}

# Function to show usage
show_usage() {
    echo -e "${BLUE}🚀 News Debate Platform - Quick Reference${NC}"
    echo "=========================================="
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status              Show service status"
    echo "  logs [service]      Show recent logs (worker|frontend)"
    echo "  details [service]   Show service details (worker|frontend)"
    echo "  deploy              Deploy both services"
    echo "  deploy-worker       Deploy only worker"
    echo "  deploy-frontend     Deploy only frontend"
    echo "  secrets             List all secrets"
    echo "  help                Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 status                    # Show all service status"
    echo "  $0 logs worker               # Show worker logs"
    echo "  $0 details frontend          # Show frontend details"
    echo "  $0 deploy                    # Deploy everything"
    echo ""
}

# Main execution
case "${1:-help}" in
    status)
        show_status
        ;;
    logs)
        if [ -z "$2" ]; then
            echo -e "${YELLOW}Please specify service: worker or frontend${NC}"
            echo "Usage: $0 logs [worker|frontend]"
            exit 1
        fi
        
        case "$2" in
            worker)
                show_logs ${WORKER_SERVICE}
                ;;
            frontend)
                show_logs ${FRONTEND_SERVICE}
                ;;
            *)
                echo -e "${RED}Invalid service: $2${NC}"
                echo "Use: worker or frontend"
                exit 1
                ;;
        esac
        ;;
    details)
        if [ -z "$2" ]; then
            echo -e "${YELLOW}Please specify service: worker or frontend${NC}"
            echo "Usage: $0 details [worker|frontend]"
            exit 1
        fi
        
        case "$2" in
            worker)
                show_details ${WORKER_SERVICE}
                ;;
            frontend)
                show_details ${FRONTEND_SERVICE}
                ;;
            *)
                echo -e "${RED}Invalid service: $2${NC}"
                echo "Use: worker or frontend"
                exit 1
                ;;
        esac
        ;;
    deploy)
        echo -e "${BLUE}🚀 Deploying both services...${NC}"
        ./deploy-all.sh
        ;;
    deploy-worker)
        echo -e "${BLUE}🔧 Deploying worker service...${NC}"
        ./deploy-all.sh --worker-only
        ;;
    deploy-frontend)
        echo -e "${BLUE}🌐 Deploying frontend service...${NC}"
        ./deploy-all.sh --frontend-only
        ;;
    secrets)
        echo -e "${BLUE}🔐 Available Secrets${NC}"
        echo "=========================================="
        gcloud secrets list --format="table(name,createTime)"
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_usage
        exit 1
        ;;
esac
