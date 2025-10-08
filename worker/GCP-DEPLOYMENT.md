# Google Cloud Deployment Guide - Battle Completion Worker

This guide covers deploying the Battle Completion Worker service to Google Cloud Run with automated deployment scripts.

## 🚀 Quick Start (Automated Deployment)

### First Time Setup (One-time only)

1. **Run the setup script**:
   ```bash
   ./scripts/setup.sh
   ```
   This will:
   - Enable required Google Cloud APIs
   - Create secrets for environment variables
   - Set up IAM permissions

2. **Deploy the service**:
   ```bash
   npm run deploy
   ```

That's it! Your service is now deployed and running.

## 📋 Prerequisites

- **Google Cloud Account**: Sign up at [Google Cloud Console](https://console.cloud.google.com)
- **Google Cloud CLI**: Install from [here](https://cloud.google.com/sdk/docs/install)
- **Node.js 18+**: For running deployment scripts
- **Docker**: For building container images

## 🔧 Automated Deployment Commands

### Main Deployment Commands

```bash
# Full deployment (recommended)
npm run deploy

# Individual deployment steps
npm run deploy:build    # Build and push Docker image
npm run deploy:run      # Deploy to Cloud Run
npm run deploy:full      # Build and deploy (no testing)
```

### Testing Commands

```bash
# Test service health
npm run test:health

# Test service status with API key
npm run test:status
```

### Monitoring Commands

```bash
# View recent logs
npm run logs
```

### Development Commands

```bash
# Run locally in development mode
npm run dev

# Run locally in production mode
npm start
```

## 🌐 Service Information

- **Service URL**: `https://battle-completion-worker-733567590021.us-central1.run.app`
- **API Key**: `92d4cca6-2987-417c-b6bf-36ac4cba6972`
- **Project**: `battle-worker-phraseflow`
- **Region**: `us-central1`

## 🔐 API Endpoints

### Health Check (No API key required)
```bash
curl https://battle-completion-worker-733567590021.us-central1.run.app/health
```

### Status Check (API key required)
```bash
curl -H "X-API-Key: 92d4cca6-2987-417c-b6bf-36ac4cba6972" \
  https://battle-completion-worker-733567590021.us-central1.run.app/status
```

### Initialize Battle Manager (API key required)
```bash
curl -X POST -H "X-API-Key: 92d4cca6-2987-417c-b6bf-36ac4cba6972" \
  https://battle-completion-worker-733567590021.us-central1.run.app/init
```

### Trigger Manual Check (API key required)
```bash
curl -X POST -H "X-API-Key: 92d4cca6-2987-417c-b6bf-36ac4cba6972" \
  https://battle-completion-worker-733567590021.us-central1.run.app/trigger
```

## 🛠️ Manual Deployment (Alternative)

If you prefer manual deployment or need to customize the process:

### 1. Build and Push Docker Image

```bash
# Build and push using Google Cloud Build
gcloud builds submit --tag gcr.io/battle-worker-phraseflow/battle-completion-worker .

# Or build locally and push
docker build -t gcr.io/battle-worker-phraseflow/battle-completion-worker .
docker push gcr.io/battle-worker-phraseflow/battle-completion-worker
```

### 2. Deploy to Cloud Run

```bash
gcloud run deploy battle-completion-worker \
    --image gcr.io/battle-worker-phraseflow/battle-completion-worker \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 3001 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 10 \
    --timeout 3600 \
    --set-env-vars NODE_ENV=production,NEWS_SOURCE=serper \
    --set-secrets DATABASE_URL=database-url:latest,GOOGLE_GENERATIVE_AI_API_KEY=google-ai-api-key:latest,SERPER_API_KEY=serper-api-key:latest,CURRENTS_API_KEY=currents-api-key:latest,WORKER_API_KEY=worker-api-key:latest
```

### 3. Create Secrets (One-time setup)

```bash
# Create individual secrets
echo -n "your-database-url" | gcloud secrets create database-url --data-file=-
echo -n "your-google-ai-key" | gcloud secrets create google-ai-api-key --data-file=-
echo -n "your-serper-key" | gcloud secrets create serper-api-key --data-file=-
echo -n "your-currents-key" | gcloud secrets create currents-api-key --data-file=-
echo -n "92d4cca6-2987-417c-b6bf-36ac4cba6972" | gcloud secrets create worker-api-key --data-file=-
```

## 🔧 Configuration

### Environment Variables

The service uses the following environment variables (stored as secrets):

- `DATABASE_URL` - PostgreSQL connection string (Neon cloud database)
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key for battle judging
- `SERPER_API_KEY` - Serper API key for news fetching
- `CURRENTS_API_KEY` - Currents API key for news fetching
- `WORKER_API_KEY` - API key for securing endpoints (`92d4cca6-2987-417c-b6bf-36ac4cba6972`)

### Resource Configuration

- **CPU**: 1 vCPU
- **Memory**: 512Mi
- **Timeout**: 3600 seconds (1 hour)
- **Min Instances**: 1 (always running for reliability)
- **Max Instances**: 10 (auto-scaling)
- **Port**: 3001

## 📊 Monitoring and Logs

### View Logs

```bash
# Using npm script
npm run logs

# Using gcloud directly
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=battle-completion-worker" --limit=20 --format="table(timestamp,severity,textPayload)"
```

### Monitor Service Status

```bash
# Check service configuration
gcloud run services describe battle-completion-worker --region=us-central1

# Check service metrics in Google Cloud Console
# Visit: https://console.cloud.google.com/run/detail/us-central1/battle-completion-worker
```

## 🔄 Development Workflow

### Making Code Changes

1. **Make your changes** to the worker code
2. **Test locally** (optional):
   ```bash
   npm run dev
   ```
3. **Deploy to production**:
   ```bash
   npm run deploy
   ```
4. **Verify deployment**:
   ```bash
   npm run test:health
   npm run test:status
   ```

### Using the Deployment Script Directly

```bash
# Full deployment
./scripts/deploy.sh deploy

# Build only
./scripts/deploy.sh build

# Test deployment
./scripts/deploy.sh test

# View logs
./scripts/deploy.sh logs

# Show deployment info
./scripts/deploy.sh info
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. **Container fails to start with "MODULE_NOT_FOUND" error**
- **Cause**: Missing required services or Prisma client
- **Solution**: Ensure all required files are copied in Dockerfile
- **Fix**: The Dockerfile includes `COPY . .` and `RUN npx prisma generate`

#### 2. **Prisma client not initialized error**
- **Cause**: Prisma client not generated during build
- **Solution**: Prisma generation is included in Dockerfile
- **Fix**: `RUN npx prisma generate` step in Dockerfile

#### 3. **Database connection issues**
- **Cause**: Wrong database URL or connection string
- **Solution**: Use Neon cloud database URL
- **Fix**: Update `DATABASE_URL` secret with correct connection string

#### 4. **API key authentication errors**
- **Cause**: Missing or incorrect API key
- **Solution**: Use the predefined UUID API key
- **Fix**: Set `WORKER_API_KEY=92d4cca6-2987-417c-b6bf-36ac4cba6972`

#### 5. **Service returns "Service Unavailable"**
- **Cause**: Service not ready or configuration issues
- **Solution**: Check Cloud Run logs and service status
- **Fix**: Review logs using `npm run logs` or gcloud commands

#### 6. **Build fails with permission errors**
- **Cause**: Insufficient Google Cloud permissions
- **Solution**: Ensure proper authentication and project access
- **Fix**: Run `gcloud auth login` and verify project access

### Debug Commands

```bash
# Check service status
gcloud run services describe battle-completion-worker --region=us-central1

# View recent logs
npm run logs

# Test health endpoint
npm run test:health

# Test status endpoint
npm run test:status

# Check secrets
gcloud secrets list

# Check IAM permissions
gcloud projects get-iam-policy battle-worker-phraseflow
```

## 💰 Cost Optimization

### Current Configuration
- **Min Instances**: 1 (always running for reliability)
- **CPU Allocation**: Only during request processing
- **Memory**: 512Mi (optimized for Node.js)
- **Timeout**: 3600 seconds (1 hour for long-running tasks)

### Cost-Saving Options
- Set `--min-instances=0` for lower costs (but slower cold starts)
- Reduce memory to `256Mi` if not needed
- Adjust timeout based on actual battle duration

## 🔒 Security Features

- ✅ **API Key Authentication**: All endpoints protected except `/health`
- ✅ **Secrets Management**: Environment variables stored in Google Secret Manager
- ✅ **HTTPS Enforcement**: All traffic encrypted by default
- ✅ **Isolated Containers**: Service runs in isolated Cloud Run containers
- ✅ **IAM Permissions**: Proper service account permissions for secrets access
- ✅ **No Persistent Storage**: Stateless service design

## 📈 Scaling Configuration

The service automatically scales based on:
- HTTP request volume
- CPU usage
- Memory usage
- Custom metrics

### Scaling Parameters
- **Min Instances**: 1 (ensures always available)
- **Max Instances**: 10 (prevents runaway costs)
- **CPU**: 1 vCPU per instance
- **Memory**: 512Mi per instance

## 🎯 Key Learnings and Best Practices

### What We Learned

1. **Separate Secrets**: Each environment variable should have its own secret for better security
2. **Always-On Service**: Min instances = 1 ensures reliability for time-sensitive operations
3. **Prisma in Docker**: Must include `npx prisma generate` in Dockerfile
4. **API Key Security**: Use UUID for API keys and protect all endpoints except health
5. **Automated Deployment**: Scripts make deployment much easier and less error-prone

### Best Practices Implemented

- ✅ **Automated Scripts**: One-command deployment
- ✅ **Comprehensive Testing**: Health and status checks
- ✅ **Proper Error Handling**: Detailed logging and error recovery
- ✅ **Security First**: API key authentication and secrets management
- ✅ **Monitoring**: Easy log access and service monitoring
- ✅ **Documentation**: Clear instructions and troubleshooting guides

## 🚀 Deployment Status

**✅ FULLY OPERATIONAL**

- **Service URL**: `https://battle-completion-worker-733567590021.us-central1.run.app`
- **API Key**: `92d4cca6-2987-417c-b6bf-36ac4cba6972`
- **Status**: All endpoints working perfectly
- **Features**: AI-powered battle judging, automatic battle management, health monitoring
- **Deployment**: Fully automated with `npm run deploy`

The Battle Completion Worker is now production-ready with automated deployment! 🎉