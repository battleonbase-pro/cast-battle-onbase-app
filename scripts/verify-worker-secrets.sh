#!/bin/bash

# Comprehensive verification script for worker secrets and configuration
# Checks all secrets, contract addresses, and validates format

PROJECT_ID="battle-worker-phraseflow"
echo "🔍 VERIFYING WORKER SECRETS AND CONFIGURATION"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to validate hex string
validate_hex_string() {
    local value=$1
    local name=$2
    local expected_length=$3
    
    echo -n "   Checking ${name}... "
    
    # Remove whitespace
    local trimmed=$(echo -n "$value" | tr -d '[:space:]')
    
    # Check length
    local length=${#trimmed}
    if [ "$length" -ne "$expected_length" ]; then
        echo -e "${RED}❌ FAILED${NC} (length: $length, expected: $expected_length)"
        return 1
    fi
    
    # Check starts with 0x
    if [[ ! "$trimmed" =~ ^0x ]]; then
        echo -e "${RED}❌ FAILED${NC} (does not start with 0x)"
        return 1
    fi
    
    # Check hex format (after 0x)
    local hex_part=${trimmed:2}
    if [[ ! "$hex_part" =~ ^[0-9a-fA-F]+$ ]]; then
        echo -e "${RED}❌ FAILED${NC} (invalid hex characters)"
        return 1
    fi
    
    # Check for special characters
    if [[ "$trimmed" =~ [^0-9a-fA-Fx] ]]; then
        echo -e "${RED}❌ FAILED${NC} (contains special characters)"
        return 1
    fi
    
    echo -e "${GREEN}✅ VALID${NC} (length: $length, format: ${trimmed:0:10}...${trimmed: -10})"
    return 0
}

# Function to validate contract address
validate_contract_address() {
    local value=$1
    local name=$2
    
    echo -n "   Checking ${name}... "
    
    local trimmed=$(echo -n "$value" | tr -d '[:space:]')
    local length=${#trimmed}
    
    if [ "$length" -ne 42 ]; then
        echo -e "${RED}❌ FAILED${NC} (length: $length, expected: 42)"
        return 1
    fi
    
    if [[ ! "$trimmed" =~ ^0x ]]; then
        echo -e "${RED}❌ FAILED${NC} (does not start with 0x)"
        return 1
    fi
    
    local hex_part=${trimmed:2}
    if [[ ! "$hex_part" =~ ^[0-9a-fA-F]+$ ]]; then
        echo -e "${RED}❌ FAILED${NC} (invalid hex characters)"
        return 1
    fi
    
    echo -e "${GREEN}✅ VALID${NC} (${trimmed})"
    return 0
}

# Function to check secret
check_secret() {
    local secret_name=$1
    local description=$2
    local validator=$3
    local expected_length=$4
    
    echo "📋 Checking: ${description}"
    echo "   Secret Name: ${secret_name}"
    
    if ! gcloud secrets describe "${secret_name}" --project=${PROJECT_ID} &>/dev/null; then
        echo -e "   ${RED}❌ Secret not found${NC}"
        return 1
    fi
    
    local value=$(gcloud secrets versions access latest --secret="${secret_name}" --project=${PROJECT_ID} 2>&1)
    if [ $? -ne 0 ]; then
        echo -e "   ${RED}❌ Failed to access secret${NC}"
        return 1
    fi
    
    local length=$(echo -n "$value" | wc -c)
    echo "   Raw Length: $length characters"
    
    # Check for newlines
    local newline_count=$(echo -n "$value" | grep -c $'\n' || echo "0")
    if [ "$newline_count" -gt 0 ]; then
        echo -e "   ${YELLOW}⚠️  WARNING: Contains $newline_count newline(s)${NC}"
    fi
    
    # Validate using appropriate validator
    if [ "$validator" = "hex_private_key" ]; then
        validate_hex_string "$value" "Format" "$expected_length"
    elif [ "$validator" = "contract_address" ]; then
        validate_contract_address "$value" "Format"
    else
        echo "   Value: ${value:0:20}... (truncated)"
    fi
    
    echo ""
    return 0
}

# Check Oracle Private Key
echo "1️⃣  ORACLE_PRIVATE_KEY"
echo "-------------------"
check_secret "oracle-private-key" "Oracle Private Key" "hex_private_key" 66

# Check Contract Address
echo "2️⃣  DEBATE_POOL_CONTRACT_ADDRESS"
echo "-------------------------------"
check_secret "debate-pool-contract-address" "Debate Pool Contract Address" "contract_address" 42

# Check RPC URL
echo "3️⃣  BASE_SEPOLIA_RPC"
echo "-------------------"
check_secret "base-sepolia-rpc" "Base Sepolia RPC URL" "url" 0

# Check other secrets exist
echo "4️⃣  OTHER REQUIRED SECRETS"
echo "-------------------------"
SECRETS=(
    "database-url:Database URL"
    "google-generative-ai-api-key:Google AI API Key"
    "serper-api-key:Serper API Key"
    "battle-worker-secrets:Worker API Key"
)

for secret_info in "${SECRETS[@]}"; do
    IFS=':' read -r secret_name description <<< "$secret_info"
    echo -n "   ${description} (${secret_name}): "
    if gcloud secrets describe "${secret_name}" --project=${PROJECT_ID} &>/dev/null; then
        local length=$(gcloud secrets versions access latest --secret="${secret_name}" --project=${PROJECT_ID} 2>&1 | wc -c)
        echo -e "${GREEN}✅ EXISTS${NC} (length: $length)"
    else
        echo -e "${RED}❌ NOT FOUND${NC}"
    fi
done

echo ""

# Check Cloud Run service configuration
echo "5️⃣  CLOUD RUN SERVICE CONFIGURATION"
echo "-----------------------------------"
echo "Checking deployed service secrets..."

SERVICE_NAME="battle-completion-worker"
REGION="us-central1"

# Get service configuration
SERVICE_CONFIG=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID} --format="yaml" 2>&1)

if echo "$SERVICE_CONFIG" | grep -q "oracle-private-key"; then
    echo -e "   ORACLE_PRIVATE_KEY: ${GREEN}✅ Configured${NC}"
else
    echo -e "   ORACLE_PRIVATE_KEY: ${RED}❌ NOT Configured${NC}"
fi

if echo "$SERVICE_CONFIG" | grep -q "debate-pool-contract-address"; then
    echo -e "   DEBATE_POOL_CONTRACT_ADDRESS: ${GREEN}✅ Configured${NC}"
else
    echo -e "   DEBATE_POOL_CONTRACT_ADDRESS: ${RED}❌ NOT Configured${NC}"
fi

if echo "$SERVICE_CONFIG" | grep -q "base-sepolia-rpc"; then
    echo -e "   BASE_SEPOLIA_RPC: ${GREEN}✅ Configured${NC}"
else
    echo -e "   BASE_SEPOLIA_RPC: ${YELLOW}⚠️  May use default${NC}"
fi

echo ""

# Verify contract address matches expected
echo "6️⃣  CONTRACT ADDRESS VERIFICATION"
echo "----------------------------------"
EXPECTED_CONTRACT="0xf9BA696bB9dC1c2d727522e7539596918a2066f4"
ACTUAL_CONTRACT=$(gcloud secrets versions access latest --secret="debate-pool-contract-address" --project=${PROJECT_ID} 2>&1 | tr -d '[:space:]')

echo "   Expected: ${EXPECTED_CONTRACT}"
echo "   Actual:   ${ACTUAL_CONTRACT}"

if [ "$EXPECTED_CONTRACT" = "$ACTUAL_CONTRACT" ]; then
    echo -e "   ${GREEN}✅ CONTRACT ADDRESS MATCHES${NC}"
else
    echo -e "   ${RED}❌ CONTRACT ADDRESS MISMATCH${NC}"
fi

echo ""

# Summary
echo "📊 SUMMARY"
echo "=========="
echo "All checks completed. Review the output above for any issues."
echo ""
echo "💡 If you see any ❌ failures:"
echo "   1. Fix the secret using: gcloud secrets versions add <secret-name> --data-file=-"
echo "   2. Redeploy the worker service"
echo ""

