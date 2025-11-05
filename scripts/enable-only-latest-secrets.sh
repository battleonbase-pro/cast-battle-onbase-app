#!/bin/bash

# Script to ensure only the latest version of each secret is enabled in GCP Secret Manager
# This is a security best practice to disable old secret versions

set -e

PROJECT_ID=${PROJECT_ID:-"battle-worker-phraseflow"}

# List of all secrets used by the worker
SECRETS=(
    "database-url"
    "google-generative-ai-api-key"
    "serper-api-key"
    "battle-worker-secrets"
    "debate-pool-contract-address"
    "oracle-private-key"
    "base-sepolia-rpc"
)

echo "🔐 Ensuring only latest versions are enabled for all secrets"
echo "Project: ${PROJECT_ID}"
echo ""

# Set project
gcloud config set project ${PROJECT_ID} --quiet

# Process each secret
for SECRET_NAME in "${SECRETS[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Processing secret: ${SECRET_NAME}"
    echo ""
    
    # Check if secret exists
    if ! gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
        echo "⚠️  Secret '${SECRET_NAME}' does not exist. Skipping..."
        echo ""
        continue
    fi
    
    # Get all versions of the secret
    echo "📋 Fetching all versions..."
    VERSIONS=$(gcloud secrets versions list "${SECRET_NAME}" --project="${PROJECT_ID}" --format="value(name)" --sort-by=~createTime)
    
    if [ -z "$VERSIONS" ]; then
        echo "⚠️  No versions found for '${SECRET_NAME}'. Skipping..."
        echo ""
        continue
    fi
    
    # Convert to array and get latest (first one)
    VERSION_ARRAY=($VERSIONS)
    LATEST_VERSION=${VERSION_ARRAY[0]}
    
    # Extract version number (format: projects/.../secrets/.../versions/N)
    LATEST_VERSION_NUM=$(echo "$LATEST_VERSION" | sed 's/.*\/versions\///')
    
    echo "✅ Latest version: ${LATEST_VERSION_NUM}"
    echo ""
    
    # Get all versions with their state
    echo "📊 Current version states:"
    gcloud secrets versions list "${SECRET_NAME}" --project="${PROJECT_ID}" --format="table(name.basename(),state,createTime)" --sort-by=~createTime
    echo ""
    
    # Disable all old versions (keep only latest enabled)
    DISABLED_COUNT=0
    for VERSION in "${VERSION_ARRAY[@]}"; do
        VERSION_NUM=$(echo "$VERSION" | sed 's/.*\/versions\///')
        
        # Skip if this is the latest version
        if [ "$VERSION_NUM" == "$LATEST_VERSION_NUM" ]; then
            # Ensure latest version is enabled
            CURRENT_STATE=$(gcloud secrets versions describe "${VERSION_NUM}" --secret="${SECRET_NAME}" --project="${PROJECT_ID}" --format="value(state)")
            if [ "$CURRENT_STATE" != "ENABLED" ]; then
                echo "🔓 Enabling latest version ${VERSION_NUM}..."
                gcloud secrets versions enable "${VERSION_NUM}" --secret="${SECRET_NAME}" --project="${PROJECT_ID}" --quiet
                echo "✅ Enabled version ${VERSION_NUM}"
            else
                echo "✅ Latest version ${VERSION_NUM} is already enabled"
            fi
            continue
        fi
        
        # Disable old versions
        CURRENT_STATE=$(gcloud secrets versions describe "${VERSION_NUM}" --secret="${SECRET_NAME}" --project="${PROJECT_ID}" --format="value(state)")
        if [ "$CURRENT_STATE" == "ENABLED" ]; then
            echo "🔒 Disabling old version ${VERSION_NUM}..."
            gcloud secrets versions disable "${VERSION_NUM}" --secret="${SECRET_NAME}" --project="${PROJECT_ID}" --quiet
            DISABLED_COUNT=$((DISABLED_COUNT + 1))
        elif [ "$CURRENT_STATE" == "DESTROYED" ]; then
            echo "⚠️  Version ${VERSION_NUM} is already destroyed (skipped)"
        else
            echo "ℹ️  Version ${VERSION_NUM} is already disabled (state: ${CURRENT_STATE})"
        fi
    done
    
    echo ""
    if [ $DISABLED_COUNT -gt 0 ]; then
        echo "✅ Disabled ${DISABLED_COUNT} old version(s)"
    else
        echo "ℹ️  No old versions needed to be disabled"
    fi
    
    # Final status
    echo ""
    echo "📊 Final state for ${SECRET_NAME}:"
    gcloud secrets versions list "${SECRET_NAME}" --project="${PROJECT_ID}" --format="table(name.basename(),state,createTime)" --sort-by=~createTime --filter="state:ENABLED"
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Complete! All secrets now have only their latest versions enabled."
echo ""
echo "📋 Summary:"
echo "   - Only latest versions are enabled"
echo "   - Old versions are disabled (not destroyed, can be re-enabled if needed)"
echo "   - This ensures Cloud Run uses only the latest secret values"
echo ""

