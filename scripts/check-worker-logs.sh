#!/bin/bash

# Script to check worker logs for a specific battle
# Usage: ./scripts/check-worker-logs.sh "battle-id" or "trump crypto deal"

BATTLE_SEARCH="$1"
PROJECT_ID="battle-worker-phraseflow"
SERVICE_NAME="battle-completion-worker"
REGION="us-central1"

if [ -z "$BATTLE_SEARCH" ]; then
  echo "Usage: $0 <battle-id-or-title>"
  echo "Example: $0 \"trump crypto deal\""
  echo "Example: $0 \"cmhk9wstn0004m4g3oz8epnxz\""
  exit 1
fi

echo "🔍 Checking worker logs for: $BATTLE_SEARCH"
echo "=========================================="
echo ""

# Search for battle completion logs
echo "📋 Recent battle completion logs:"
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND (textPayload=~\"${BATTLE_SEARCH}\" OR textPayload=~\"Processing.*payout\" OR textPayload=~\"Failed.*payout\" OR textPayload=~\"Oracle\")" \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)" \
  --project=${PROJECT_ID} \
  2>/dev/null || echo "No logs found matching criteria"

echo ""
echo "📋 Recent payout-related errors:"
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND severity>=ERROR AND (textPayload=~\"payout\" OR textPayload=~\"oracle\" OR textPayload=~\"ORACLE_PRIVATE_KEY\" OR textPayload=~\"DEBATE_POOL_CONTRACT\")" \
  --limit=20 \
  --format="table(timestamp,severity,textPayload)" \
  --project=${PROJECT_ID} \
  2>/dev/null || echo "No error logs found"

echo ""
echo "📋 Oracle initialization logs:"
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND (textPayload=~\"Oracle\" OR textPayload=~\"ORACLE_PRIVATE_KEY\" OR textPayload=~\"DEBATE_POOL_CONTRACT\")" \
  --limit=10 \
  --format="table(timestamp,severity,textPayload)" \
  --project=${PROJECT_ID} \
  2>/dev/null || echo "No oracle logs found"

