# Battle Completion Worker

This worker service automatically completes expired battles and creates new ones. It's designed to run as a separate service since Vercel's free tier only allows 1 cron invocation per day.

## 🚀 Quick Deploy (Recommended)

### Railway (Free Tier - $5 Credit)
1. Go to [Railway](https://railway.app)
2. Click "Deploy from GitHub repo"
3. Select your repository
4. Choose "Deploy from folder" and select `worker/` directory
5. Set environment variables:
   - `DATABASE_URL` (same as your main app)
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `SERPER_API_KEY`
6. Deploy - Railway will automatically run the worker

### Render (Free Tier - 750 hours/month)
1. Go to [Render](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Set:
   - **Build Command**: `cd worker && npm install`
   - **Start Command**: `cd worker && npm start`
   - **Root Directory**: `worker`
5. Set environment variables
6. Deploy

### Fly.io (Free Tier - 3 small VMs)
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. In the `worker/` directory, run: `fly launch`
4. Set environment variables: `fly secrets set DATABASE_URL=...`
5. Deploy: `fly deploy`

## 🛠️ Local Development

```bash
cd worker
npm install
npm run dev
```

## 📊 Features

- ✅ **Automatic Battle Completion**: Checks every 5 minutes
- ✅ **Error Recovery**: Retry logic with automatic reinitialization
- ✅ **Health Monitoring**: Comprehensive status reporting
- ✅ **Graceful Shutdown**: Proper cleanup on termination
- ✅ **Production Ready**: Optimized for long-running processes
- ✅ **TypeScript**: Full type safety and better development experience

## 🔧 Environment Variables

The worker needs the same environment variables as your main app:

```bash
DATABASE_URL="postgresql://username:password@host:port/database"
GOOGLE_GENERATIVE_AI_API_KEY="your-google-api-key"
SERPER_API_KEY="your-serper-api-key"
BATTLE_DURATION_HOURS="4"  # Optional, defaults to 4
NODE_ENV="production"      # Optional
```

## 📈 Monitoring

The worker provides comprehensive logging and status information:

### Console Logs
- 🚀 Initialization status
- 🕐 Battle check timestamps
- ✅ Success/failure status
- 📊 Hourly status reports
- ❌ Error details with retry counts

### Status Endpoint
Access worker status via the hosting platform's logs or add a simple HTTP endpoint.

## 🔄 How It Works

1. **Initialization**: Worker starts and initializes Battle Manager
2. **Scheduled Checks**: Every 5 minutes, checks for expired battles
3. **Battle Completion**: If expired battles found, completes them with AI judging
4. **New Battle Creation**: Creates new battles immediately after completion
5. **SSE Broadcasting**: Notifies connected clients via Server-Sent Events (on Vercel)
6. **Error Recovery**: Handles failures with retry logic and reinitialization
7. **HTTP Endpoints**: Provides monitoring and management endpoints

## 🌐 HTTP Endpoints

The worker provides HTTP endpoints for monitoring and management:

- `GET /health` - Worker health status and metrics
- `GET /status` - Battle manager status and current battle info
- `GET /init` - Get battle manager status
- `POST /init` - Initialize battle manager
- `POST /trigger` - Manually trigger battle completion check

## 🚨 Error Handling

- **Retry Logic**: Up to 3 retries before reinitialization
- **Automatic Recovery**: Reinitializes Battle Manager on persistent failures
- **Graceful Shutdown**: Proper cleanup on SIGINT/SIGTERM
- **Uncaught Exception Handling**: Prevents worker crashes

## 📋 Deployment Checklist

- [ ] Environment variables set
- [ ] Database connection working
- [ ] API keys configured
- [ ] Worker starts successfully
- [ ] Battle completion working
- [ ] Logs showing regular checks
- [ ] Monitoring set up (optional)

## 🎯 Expected Behavior

Once deployed, you should see logs like:
```
🌟 Battle Completion Worker starting...
🚀 Initializing Battle Completion Worker...
✅ Battle Manager initialized successfully
🔄 Starting battle completion worker...
✅ Battle completion worker started (checking every 5 minutes)
🕐 [2024-01-01T12:00:00.000Z] Starting battle completion check...
✅ [2024-01-01T12:00:05.000Z] Battle check completed successfully in 5000ms
```
