#!/bin/bash

# Detailed verification with exact byte inspection
# This will show the exact content of each secret

PROJECT_ID="battle-worker-phraseflow"

echo "🔍 DETAILED SECRET VERIFICATION"
echo "================================="
echo ""

verify_secret_detailed() {
    local secret_name=$1
    local description=$2
    local expected_value=$3
    
    echo "📋 ${description}"
    echo "   Secret: ${secret_name}"
    
    # Get secret value
    local value=$(gcloud secrets versions access latest --secret="${secret_name}" --project=${PROJECT_ID} 2>&1)
    if [ $? -ne 0 ]; then
        echo "   ❌ Failed to access"
        return 1
    fi
    
    # Get lengths
    local with_newline=$(echo "$value" | wc -c)
    local without_newline=$(echo -n "$value" | wc -c)
    local trimmed=$(echo -n "$value" | tr -d '\n\r')
    local trimmed_length=${#trimmed}
    
    echo "   Length (with newline): $with_newline"
    echo "   Length (without newline): $without_newline"
    echo "   Length (trimmed): $trimmed_length"
    
    # Check for newline
    if [ "$with_newline" -gt "$trimmed_length" ]; then
        echo "   ⚠️  Contains newline(s)!"
        local newline_count=$((with_newline - trimmed_length))
        echo "   Newline count: $newline_count"
    else
        echo "   ✅ No newlines detected"
    fi
    
    # Show hex dump of last bytes
    echo "   Last 20 bytes (hex):"
    echo -n "$value" | tail -c 20 | od -An -tx1 | sed 's/^/      /'
    
    # Show actual value (truncated)
    echo "   Value (first 20 chars): $(echo -n "$trimmed" | head -c 20)..."
    echo "   Value (last 20 chars): ...$(echo -n "$trimmed" | tail -c 20)"
    
    # Compare with expected if provided
    if [ -n "$expected_value" ]; then
        local expected_trimmed=$(echo -n "$expected_value" | tr -d '\n\r')
        if [ "$trimmed" = "$expected_trimmed" ]; then
            echo "   ✅ Matches expected value"
        else
            echo "   ❌ Does NOT match expected value"
            echo "   Expected: ${expected_trimmed}"
            echo "   Got:      ${trimmed}"
        fi
    fi
    
    # Validate format
    if [ "$secret_name" = "oracle-private-key" ]; then
        if [ "$trimmed_length" -eq 66 ] && [[ "$trimmed" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
            echo "   ✅ Format: Valid private key (66 chars, hex)"
        else
            echo "   ❌ Format: Invalid (expected 66-char hex string starting with 0x)"
        fi
    elif [ "$secret_name" = "debate-pool-contract-address" ]; then
        if [ "$trimmed_length" -eq 42 ] && [[ "$trimmed" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
            echo "   ✅ Format: Valid contract address (42 chars, hex)"
        else
            echo "   ❌ Format: Invalid (expected 42-char hex address starting with 0x)"
        fi
    fi
    
    echo ""
}

# Verify Oracle Private Key
verify_secret_detailed "oracle-private-key" "Oracle Private Key" ""

# Verify Contract Address (with expected value)
verify_secret_detailed "debate-pool-contract-address" "Debate Pool Contract Address" "0xf9BA696bB9dC1c2d727522e7539596918a2066f4"

# Verify RPC URL
verify_secret_detailed "base-sepolia-rpc" "Base Sepolia RPC URL" ""

echo "📊 SUMMARY"
echo "=========="
echo "Check the output above for:"
echo "  - Newline warnings (should be fixed)"
echo "  - Format validation (should be ✅)"
echo "  - Value matching (contract address should match)"
echo ""

