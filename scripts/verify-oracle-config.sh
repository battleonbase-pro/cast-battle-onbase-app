#!/bin/bash

# Script to verify oracle configuration in production
# Checks if secrets are properly set in GCP Cloud Run

PROJECT_ID="battle-worker-phraseflow"
SERVICE_NAME="battle-completion-worker"
REGION="us-central1"

echo "🔍 Checking Oracle Configuration in Production"
echo "=============================================="
echo ""

# Check if secrets exist
echo "📋 Checking GCP Secrets:"
echo "------------------------"

SECRETS=(
  "oracle-private-key"
  "debate-pool-contract-address"
  "base-sepolia-rpc"
  "database-url"
)

for secret in "${SECRETS[@]}"; do
  if gcloud secrets describe "$secret" --project=${PROJECT_ID} &>/dev/null; then
    echo "✅ Secret '$secret' exists"
    # Check if it has versions
    VERSIONS=$(gcloud secrets versions list "$secret" --project=${PROJECT_ID} --format="value(name)" 2>/dev/null | wc -l)
    if [ "$VERSIONS" -gt 0 ]; then
      echo "   Versions: $VERSIONS"
    else
      echo "   ⚠️  No versions found"
    fi
  else
    echo "❌ Secret '$secret' NOT FOUND"
  fi
done

echo ""
echo "📋 Checking Cloud Run Service Configuration:"
echo "---------------------------------------------"

# Get service configuration
SERVICE_CONFIG=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID} --format="yaml" 2>/dev/null)

if [ -z "$SERVICE_CONFIG" ]; then
  echo "❌ Service not found or cannot access"
  exit 1
fi

# Check for secrets in service config
echo "Checking for secrets in service configuration..."

if echo "$SERVICE_CONFIG" | grep -q "oracle-private-key"; then
  echo "✅ ORACLE_PRIVATE_KEY secret is configured"
else
  echo "❌ ORACLE_PRIVATE_KEY secret NOT configured in service"
fi

if echo "$SERVICE_CONFIG" | grep -q "debate-pool-contract-address"; then
  echo "✅ DEBATE_POOL_CONTRACT_ADDRESS secret is configured"
else
  echo "❌ DEBATE_POOL_CONTRACT_ADDRESS secret NOT configured in service"
fi

if echo "$SERVICE_CONFIG" | grep -q "base-sepolia-rpc"; then
  echo "✅ BASE_SEPOLIA_RPC secret is configured"
else
  echo "⚠️  BASE_SEPOLIA_RPC secret NOT configured (may use default)"
fi

echo ""
echo "📋 Service Details:"
echo "-------------------"
gcloud run services describe ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID} --format="table(metadata.name,status.url,spec.template.spec.containers[0].env[].name)" 2>/dev/null | head -20

echo ""
echo "💡 To update secrets:"
echo "   1. Update secret value: gcloud secrets versions add oracle-private-key --data-file=-"
echo "   2. Redeploy service: cd worker && npm run deploy"
echo ""

