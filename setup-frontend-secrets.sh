#!/bin/bash

# GCP Configuration
PROJECT_ID="battle-worker-phraseflow"

echo "🔐 Setting up Google Cloud Secrets for Frontend Deployment"
echo "Project ID: ${PROJECT_ID}"

# Set the project
gcloud config set project ${PROJECT_ID}

# Create secrets for environment variables
echo "📝 Creating secrets..."

# Database URL
echo "Creating database-url secret..."
echo "postgresql://neondb_owner:npg_D3IEzufLxR0X@ep-mute-mouse-ad8zedq9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&connection_limit=20&pool_timeout=20&connect_timeout=60" | gcloud secrets create database-url --data-file=- || echo "Secret database-url already exists"

# Worker Base URL
echo "Creating worker-base-url secret..."
echo "https://battle-completion-worker-733567590021.us-central1.run.app" | gcloud secrets create worker-base-url --data-file=- || echo "Secret worker-base-url already exists"

# Worker API Key
echo "Creating worker-api-key secret..."
echo "92d4cca6-2987-417c-b6bf-36ac4cba6972" | gcloud secrets create worker-api-key --data-file=- || echo "Secret worker-api-key already exists"

# Google Generative AI API Key
echo "Creating google-generative-ai-api-key secret..."
echo "AIzaSyARNpDZ3ZBNbZVOcQiGcvwuYWyYOgMnkRQ" | gcloud secrets create google-generative-ai-api-key --data-file=- || echo "Secret google-generative-ai-api-key already exists"

# Serper API Key
echo "Creating serper-api-key secret..."
echo "28f3c10e8a7637ec90b3c5360a2b703c97aa6246" | gcloud secrets create serper-api-key --data-file=- || echo "Secret serper-api-key already exists"

# WalletConnect Project ID
echo "Creating walletconnect-project-id secret..."
echo "c0d7f98071176b0ac83ddb0a2954d574" | gcloud secrets create walletconnect-project-id --data-file=- || echo "Secret walletconnect-project-id already exists"

echo "✅ Secrets setup complete!"
echo "🔍 Listing all secrets:"
gcloud secrets list
