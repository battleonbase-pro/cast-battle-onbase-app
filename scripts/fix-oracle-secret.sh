#!/bin/bash

# Script to fix the ORACLE_PRIVATE_KEY secret by removing trailing newline
# This fixes the "invalid BytesLike value" error

PROJECT_ID="battle-worker-phraseflow"
SECRET_NAME="oracle-private-key"

echo "🔧 Fixing ORACLE_PRIVATE_KEY Secret"
echo "===================================="
echo ""

# Get current secret value
echo "📋 Current secret value:"
CURRENT_VALUE=$(gcloud secrets versions access latest --secret="${SECRET_NAME}" --project=${PROJECT_ID} 2>&1)
echo "   Length: $(echo -n "$CURRENT_VALUE" | wc -c) characters"
echo "   Has newline: $([ "$(echo -n "$CURRENT_VALUE" | wc -c)" -eq 66 ] && echo "NO ✅" || echo "YES ❌")"
echo ""

# Remove trailing newline and create new version
echo "🔄 Creating new secret version without trailing newline..."
echo -n "$CURRENT_VALUE" | tr -d '\n' | gcloud secrets versions add "${SECRET_NAME}" --data-file=- --project=${PROJECT_ID}

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Secret updated successfully!"
  echo ""
  echo "📋 New secret value:"
  NEW_VALUE=$(gcloud secrets versions access latest --secret="${SECRET_NAME}" --project=${PROJECT_ID} 2>&1)
  echo "   Length: $(echo -n "$NEW_VALUE" | wc -c) characters"
  echo "   Format: $(echo -n "$NEW_VALUE" | head -c 10)...$(echo -n "$NEW_VALUE" | tail -c 10)"
  echo ""
  echo "🚀 Next step: Redeploy worker service"
  echo "   cd worker && npm run deploy"
else
  echo ""
  echo "❌ Failed to update secret"
  exit 1
fi

