#!/bin/bash

# Google Cloud Environment Setup Script
# Usage: ./setup-gcp-env.sh [PROJECT_ID]

set -e

PROJECT_ID=${1:-"your-project-id"}

echo "🔧 Setting up Google Cloud environment for Battle Completion Worker"
echo "Project ID: ${PROJECT_ID}"

# Set project
gcloud config set project ${PROJECT_ID}

# Create secrets
echo "🔐 Creating secrets..."

# Database URL
echo "Enter your DATABASE_URL:"
read -s DATABASE_URL
echo -n "$DATABASE_URL" | gcloud secrets create battle-worker-secrets --data-file=- --replication-policy="automatic" 2>/dev/null || \
echo -n "$DATABASE_URL" | gcloud secrets versions add battle-worker-secrets --data-file=-

# Google API Key
echo "Enter your GOOGLE_GENERATIVE_AI_API_KEY:"
read -s GOOGLE_API_KEY
echo -n "$GOOGLE_API_KEY" | gcloud secrets versions add battle-worker-secrets --data-file=-

# Serper API Key
echo "Enter your SERPER_API_KEY:"
read -s SERPER_API_KEY
echo -n "$SERPER_API_KEY" | gcloud secrets versions add battle-worker-secrets --data-file=-

# Currents API Key
echo "Enter your CURRENTS_API_KEY:"
read -s CURRENTS_API_KEY
echo -n "$CURRENTS_API_KEY" | gcloud secrets versions add battle-worker-secrets --data-file=-

# Worker API Key
echo "Enter your WORKER_API_KEY (or press Enter for default):"
read -s WORKER_API_KEY
if [ -z "$WORKER_API_KEY" ]; then
  WORKER_API_KEY="battle-worker-secret-key-2024"
fi
echo -n "$WORKER_API_KEY" | gcloud secrets versions add battle-worker-secrets --data-file=-

echo "✅ Secrets configured successfully!"
echo "🚀 You can now run: ./deploy-gcp.sh ${PROJECT_ID}"
