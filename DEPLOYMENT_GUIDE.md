# End-to-End Deployment Guide

## Overview
This guide covers automated deployment of both the Worker and Frontend services to Google Cloud Run.

## Available Deployment Scripts

### 1. Master Deployment Script (`deploy-all.sh`)
**Deploys both services with a single command**

```bash
# Deploy both services
./deploy-all.sh

# Deploy only worker
./deploy-all.sh --worker-only

# Deploy only frontend  
./deploy-all.sh --frontend-only

# Verify existing deployments
./deploy-all.sh --verify-only

# Show help
./deploy-all.sh --help
```

### 2. Individual Service Scripts

#### Worker Service (`worker/deploy-gcp.sh`)
- **Service Name**: `battle-completion-worker`
- **URL**: `https://battle-completion-worker-[PROJECT_NUMBER].us-central1.run.app`
- **Purpose**: Autonomous battle generation and completion

#### Frontend Service (`deploy-frontend-gcp.sh`)
- **Service Name**: `news-debate-app`
- **URL**: `https://news-debate-app-[PROJECT_NUMBER].us-central1.run.app`
- **Purpose**: Next.js web application

## Prerequisites

### 1. Google Cloud Setup
```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login
gcloud config set project battle-worker-phraseflow

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. Docker Setup
```bash
# Install Docker Desktop
# https://www.docker.com/products/docker-desktop/

# Configure Docker for GCR
gcloud auth configure-docker
```

### 3. Environment Variables
All environment variables are stored in Google Secret Manager:

**Required Secrets:**
- `database-url` - Neon PostgreSQL connection string
- `worker-base-url` - Worker service URL
- `worker-api-key` - Worker API key
- `google-generative-ai-api-key` - Google AI API key
- `serper-api-key` - Serper news API key
- `walletconnect-project-id` - WalletConnect project ID

## Deployment Process

### Step 1: Set Up Secrets (One-time)
```bash
# Run the secrets setup script
./setup-frontend-secrets.sh
```

### Step 2: Deploy Services
```bash
# Option A: Deploy everything at once
./deploy-all.sh

# Option B: Deploy services individually
cd worker && ./deploy-gcp.sh && cd ..
./deploy-frontend-gcp.sh
```

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Run                          │
├─────────────────────────────────────────────────────────────┤
│  Frontend Service (news-debate-app)                         │
│  ├── Next.js Application                                    │
│  ├── API Routes (/api/*)                                    │
│  ├── Database Access (Prisma)                                │
│  └── Worker Communication                                   │
│                                                             │
│  Worker Service (battle-completion-worker)                 │
│  ├── Battle Generation                                      │
│  ├── Battle Completion                                      │
│  ├── Timer Management                                       │
│  └── SSE Broadcasting                                       │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Details

### Worker Service
- **Memory**: 512Mi
- **CPU**: 1
- **Min Instances**: 1 (always warm)
- **Max Instances**: 10
- **Port**: 3001
- **Timeout**: 3600s

### Frontend Service
- **Memory**: 1Gi
- **CPU**: 1
- **Min Instances**: 0 (scale to zero)
- **Max Instances**: 10
- **Port**: 3000
- **Timeout**: 3600s

## Monitoring and Logs

### View Logs
```bash
# Worker logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=battle-completion-worker" --limit 50

# Frontend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=news-debate-app" --limit 50
```

### Service Status
```bash
# List all services
gcloud run services list --region=us-central1

# Get service details
gcloud run services describe battle-completion-worker --region=us-central1
gcloud run services describe news-debate-app --region=us-central1
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Docker is running
   - Verify gcloud authentication
   - Check for architecture mismatches (use `--platform linux/amd64`)

2. **Permission Errors**
   - Ensure service account has Secret Manager access
   - Check IAM permissions

3. **Service Not Starting**
   - Check logs for startup errors
   - Verify environment variables are set correctly
   - Check port configuration

### Useful Commands
```bash
# Check authentication
gcloud auth list

# Check project
gcloud config get-value project

# List secrets
gcloud secrets list

# Check service account permissions
gcloud projects get-iam-policy battle-worker-phraseflow
```

## Cost Optimization

- **Worker**: Min instances = 1 (always warm for autonomous operation)
- **Frontend**: Min instances = 0 (scale to zero when not in use)
- **Memory**: Optimized for each service's needs
- **CPU**: Single CPU sufficient for both services

## Security

- All sensitive data stored in Google Secret Manager
- Services communicate via HTTPS
- No public access to database
- API keys secured via environment variables

## Updates and Maintenance

### Updating Services
```bash
# Update both services
./deploy-all.sh

# Update specific service
./deploy-all.sh --worker-only
./deploy-all.sh --frontend-only
```

### Rolling Back
```bash
# List revisions
gcloud run revisions list --service=battle-completion-worker --region=us-central1
gcloud run revisions list --service=news-debate-app --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic battle-completion-worker --to-revisions=REVISION_NAME=100 --region=us-central1
```
