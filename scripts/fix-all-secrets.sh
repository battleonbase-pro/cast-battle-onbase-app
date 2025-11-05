#!/bin/bash

# Fix all secrets by removing trailing newlines
# This ensures no special characters cause issues

PROJECT_ID="battle-worker-phraseflow"

echo "🔧 FIXING ALL SECRETS (Removing Trailing Newlines)"
echo "=================================================="
echo ""

fix_secret() {
    local secret_name=$1
    local description=$2
    
    echo "📋 Fixing: ${description}"
    
    # Get current value
    local current_value=$(gcloud secrets versions access latest --secret="${secret_name}" --project=${PROJECT_ID} 2>&1)
    if [ $? -ne 0 ]; then
        echo "   ❌ Failed to access secret"
        return 1
    fi
    
    # Check if it has newline
    local raw_length=$(echo -n "$current_value" | wc -c)
    local trimmed_value=$(echo -n "$current_value" | tr -d '\n\r')
    local trimmed_length=${#trimmed_value}
    
    if [ "$raw_length" -eq "$trimmed_length" ]; then
        echo "   ✅ Already clean (no newlines)"
        return 0
    fi
    
    echo "   ⚠️  Found newline(s), fixing..."
    echo -n "$trimmed_value" | gcloud secrets versions add "${secret_name}" --data-file=- --project=${PROJECT_ID} 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Fixed! New version created"
        
        # Verify
        local new_value=$(gcloud secrets versions access latest --secret="${secret_name}" --project=${PROJECT_ID} 2>&1)
        local new_length=$(echo -n "$new_value" | wc -c)
        echo "   📏 New length: $new_length characters (should be ${trimmed_length})"
        
        if [ "$new_length" -eq "$trimmed_length" ]; then
            echo "   ✅ Verification passed"
        else
            echo "   ⚠️  Length mismatch (may still have newline)"
        fi
    else
        echo "   ❌ Failed to create new version"
        return 1
    fi
    
    echo ""
    return 0
}

# Fix all critical secrets
fix_secret "oracle-private-key" "Oracle Private Key"
fix_secret "debate-pool-contract-address" "Debate Pool Contract Address"
fix_secret "base-sepolia-rpc" "Base Sepolia RPC URL"

echo "✅ All secrets fixed!"
echo ""
echo "🚀 Next step: Redeploy worker service"
echo "   cd worker && npm run deploy:run"

