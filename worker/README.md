# Battle Completion Worker

A Google Cloud Run service for automatic battle completion and management in the NewsCast Debate application.

## 🚀 Quick Deployment

### First Time Setup

1. **Run the setup script** (one-time only):
   ```bash
   ./scripts/setup.sh
   ```
   This will:
   - Enable required Google Cloud APIs
   - Create secrets for environment variables
   - Set up IAM permissions

### Regular Deployments

After the initial setup, deploying changes is as simple as:

```bash
npm run deploy
```

This single command will:
- Build and push the Docker image
- Deploy to Cloud Run
- Test the deployment
- Show deployment information

## 📋 Available Commands

### Deployment Commands
- `npm run deploy` - Full deployment (build + deploy + test)
- `npm run deploy:build` - Build and push Docker image only
- `npm run deploy:run` - Deploy to Cloud Run only
- `npm run deploy:full` - Build and deploy (no testing)

### Testing Commands
- `npm run test:health` - Test health endpoint
- `npm run test:status` - Test status endpoint with API key

### Monitoring Commands
- `npm run logs` - View recent Cloud Run logs

### Development Commands
- `npm run dev` - Run in development mode with hot reload
- `npm start` - Run in production mode locally

## 🔧 Manual Script Usage

You can also use the deployment script directly:

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

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Google Cloud CLI
- Docker (for local testing)

### Local Development
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
```

### Environment Variables
The service uses the following environment variables (set as secrets in Cloud Run):
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key
- `SERPER_API_KEY` - Serper API key for news
- `CURRENTS_API_KEY` - Currents API key for news
- `WORKER_API_KEY` - API key for securing endpoints

## 📊 Monitoring

### View Logs
```bash
# Using npm script
npm run logs

# Using gcloud directly
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=battle-completion-worker" --limit=20
```

### Check Service Status
```bash
gcloud run services describe battle-completion-worker --region=us-central1
```

## 🔄 Workflow for Code Changes

1. **Make your code changes**
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

That's it! The deployment process is now fully automated and requires just one command.