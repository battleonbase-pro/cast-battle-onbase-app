# Next.js Frontend Deployment to Google Cloud Run

## Overview
This guide deploys the Next.js frontend to Google Cloud Run as a separate service from the worker.

## Prerequisites
- Google Cloud SDK installed and authenticated
- Docker installed
- Access to the GCP project: `battle-worker-phraseflow`

## Deployment Steps

### 1. Set up Google Cloud Secrets
First, create the required secrets for environment variables:

```bash
./setup-frontend-secrets.sh
```

This will create the following secrets:
- `database-url` - Neon database connection string
- `worker-base-url` - Worker service URL
- `worker-api-key` - Worker API key
- `google-generative-ai-api-key` - Google AI API key
- `serper-api-key` - Serper news API key
- `walletconnect-project-id` - WalletConnect project ID

### 2. Deploy to Cloud Run
Deploy the frontend service:

```bash
./deploy-frontend-gcp.sh
```

This will:
- Build the Docker image
- Push to Google Container Registry
- Deploy to Cloud Run with proper configuration

## Service Configuration

### Cloud Run Settings
- **Service Name**: `news-debate-frontend`
- **Region**: `us-central1`
- **Memory**: 1Gi
- **CPU**: 1
- **Min Instances**: 0 (scale to zero)
- **Max Instances**: 10
- **Port**: 3000
- **Timeout**: 3600 seconds

### Environment Variables
- `NODE_ENV=production`
- `NEXT_PUBLIC_PROJECT_NAME=cast-battle-onbase`
- `NEWS_SOURCE=serper`
- `BATTLE_GENERATION_ENABLED=true`
- `BATTLE_DURATION_HOURS=4`
- `BATTLE_MAX_PARTICIPANTS=100`

### Secrets (from Google Secret Manager)
- `DATABASE_URL`
- `WORKER_BASE_URL`
- `WORKER_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `SERPER_API_KEY`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

## Service URLs

After deployment, your services will be available at:

- **Frontend**: `https://news-debate-frontend-battle-worker-phraseflow.us-central1.run.app`
- **Worker**: `https://battle-completion-worker-733567590021.us-central1.run.app`

## Monitoring and Logs

View logs:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=news-debate-frontend" --limit 50
```

View service details:
```bash
gcloud run services describe news-debate-frontend --region=us-central1
```

## Updating the Deployment

To update the frontend:
1. Make your changes
2. Run `./deploy-frontend-gcp.sh` again
3. The new version will be deployed automatically

## Troubleshooting

### Common Issues
1. **Build fails**: Check Dockerfile and ensure all dependencies are included
2. **Runtime errors**: Check Cloud Run logs for specific error messages
3. **Environment variables**: Verify secrets are created correctly
4. **Database connection**: Ensure DATABASE_URL secret is correct

### Useful Commands
```bash
# Check service status
gcloud run services list --region=us-central1

# View service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=news-debate-frontend" --limit 100

# Update service configuration
gcloud run services update news-debate-frontend --region=us-central1 --memory=2Gi
```

## Cost Optimization
- **Min instances**: Set to 0 to scale to zero when not in use
- **Max instances**: Limit to prevent unexpected costs
- **Memory**: Start with 1Gi, increase if needed
- **CPU**: 1 CPU is usually sufficient for Next.js apps
