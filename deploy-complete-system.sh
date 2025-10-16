#!/bin/bash

# Base Sepolia Deployment Script with Base Account SDK Integration
# This script deploys the complete on-chain debate system

set -e

echo "🚀 Starting Base Sepolia Deployment with Base Account SDK Integration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env_vars() {
    print_status "Checking environment variables..."
    
    if [ -z "$PRIVATE_KEY" ]; then
        print_error "PRIVATE_KEY environment variable is required"
        exit 1
    fi
    
    if [ -z "$ORACLE_ADDRESS" ]; then
        print_error "ORACLE_ADDRESS environment variable is required"
        exit 1
    fi
    
    print_success "Environment variables validated"
}

# Deploy smart contracts
deploy_contracts() {
    print_status "Deploying smart contracts to Base Sepolia..."
    
    cd contracts
    
    # Install dependencies
    print_status "Installing contract dependencies..."
    npm install --legacy-peer-deps
    
    # Compile contracts
    print_status "Compiling contracts..."
    npm run compile
    
    # Deploy contracts
    print_status "Deploying DebatePool contract..."
    npm run deploy:sepolia
    
    # Get contract address from deployment output
    CONTRACT_ADDRESS=$(grep "Contract Address:" deploy.log | cut -d' ' -f3)
    
    if [ -z "$CONTRACT_ADDRESS" ]; then
        print_error "Failed to get contract address from deployment"
        exit 1
    fi
    
    print_success "Contract deployed at: $CONTRACT_ADDRESS"
    
    # Test contract deployment
    print_status "Testing contract deployment..."
    DEBATE_POOL_CONTRACT_ADDRESS=$CONTRACT_ADDRESS npm run test:contract
    
    cd ..
    print_success "Smart contracts deployed and tested successfully"
}

# Update environment files
update_env_files() {
    print_status "Updating environment files..."
    
    # Update worker .env
    if [ -f "worker/.env" ]; then
        print_status "Updating worker environment..."
        echo "DEBATE_POOL_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> worker/.env
        echo "BASE_SEPOLIA_RPC=https://sepolia.base.org" >> worker/.env
        echo "ORACLE_PRIVATE_KEY=$ORACLE_PRIVATE_KEY" >> worker/.env
    fi
    
    # Update frontend .env.local
    if [ -f ".env.local" ]; then
        print_status "Updating frontend environment..."
        echo "NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> .env.local
        echo "NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org" >> .env.local
        echo "NEXT_PUBLIC_PAYMASTER_ADDRESS=" >> .env.local
    else
        print_status "Creating frontend environment file..."
        cat > .env.local << EOF
NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS=$CONTRACT_ADDRESS
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
NEXT_PUBLIC_PAYMASTER_ADDRESS=
EOF
    fi
    
    print_success "Environment files updated"
}

# Install frontend dependencies
install_frontend_deps() {
    print_status "Installing frontend dependencies..."
    
    # Install Base Account SDK
    print_status "Installing Base Account SDK..."
    npm install @base-org/account @base-org/account-ui --legacy-peer-deps
    
    # Install ethers for contract interactions
    print_status "Installing ethers..."
    npm install ethers --legacy-peer-deps
    
    print_success "Frontend dependencies installed"
}

# Build and deploy frontend
deploy_frontend() {
    print_status "Building frontend..."
    
    # Build the application
    npm run build
    
    print_status "Deploying frontend to GCP Cloud Run..."
    
    # Deploy to GCP
    ./deploy-frontend-gcp.sh
    
    print_success "Frontend deployed successfully"
}

# Deploy worker service
deploy_worker() {
    print_status "Deploying worker service..."
    
    cd worker
    
    # Install dependencies
    print_status "Installing worker dependencies..."
    npm install --legacy-peer-deps
    
    # Deploy to GCP
    print_status "Deploying worker to GCP Cloud Run..."
    ./deploy-worker-gcp.sh
    
    cd ..
    print_success "Worker service deployed successfully"
}

# Test the complete system
test_system() {
    print_status "Testing the complete system..."
    
    # Test contract interaction
    print_status "Testing contract interaction..."
    cd contracts
    DEBATE_POOL_CONTRACT_ADDRESS=$CONTRACT_ADDRESS npm run test:contract
    cd ..
    
    # Test API endpoints
    print_status "Testing API endpoints..."
    
    # Get the deployed frontend URL
    FRONTEND_URL=$(grep "Service URL:" deploy.log | cut -d' ' -f3)
    if [ -z "$FRONTEND_URL" ]; then
        FRONTEND_URL="https://news-debate-app-733567590021.us-central1.run.app"
    fi
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    curl -f "$FRONTEND_URL/api/health" || print_warning "Health endpoint test failed"
    
    # Test battle endpoint
    print_status "Testing battle endpoint..."
    curl -f "$FRONTEND_URL/api/battle/current" || print_warning "Battle endpoint test failed"
    
    print_success "System testing completed"
}

# Generate deployment summary
generate_summary() {
    print_status "Generating deployment summary..."
    
    cat > DEPLOYMENT_SUMMARY.md << EOF
# Base Sepolia Deployment Summary

## 🎯 Deployment Details

- **Network**: Base Sepolia (Chain ID: 84532)
- **Deployment Date**: $(date)
- **Contract Address**: $CONTRACT_ADDRESS

## 📋 Contract Information

- **DebatePool Contract**: $CONTRACT_ADDRESS
- **USDC Token**: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
- **Oracle Address**: $ORACLE_ADDRESS

## 🔗 Links

- **Contract on Basescan**: https://sepolia.basescan.org/address/$CONTRACT_ADDRESS
- **Frontend URL**: $FRONTEND_URL
- **Base Sepolia Faucet**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- **USDC Faucet**: https://faucet.circle.com/

## 🧪 Testing

### Test the Contract

\`\`\`bash
cd contracts
DEBATE_POOL_CONTRACT_ADDRESS=$CONTRACT_ADDRESS npm run test:contract
\`\`\`

### Test the Frontend

1. Visit: $FRONTEND_URL
2. Connect your Base Sepolia wallet
3. Get test USDC from Circle faucet
4. Join a debate with 1 USDC

## 🔧 Configuration

### Frontend Environment

\`\`\`bash
NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS=$CONTRACT_ADDRESS
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
NEXT_PUBLIC_PAYMASTER_ADDRESS=
\`\`\`

### Worker Environment

\`\`\`bash
DEBATE_POOL_CONTRACT_ADDRESS=$CONTRACT_ADDRESS
BASE_SEPOLIA_RPC=https://sepolia.base.org
ORACLE_PRIVATE_KEY=$ORACLE_PRIVATE_KEY
\`\`\`

## 🚀 Next Steps

1. **Test the Complete Flow**:
   - Create a debate
   - Join with multiple participants
   - Wait for AI judging
   - Verify USDC distribution

2. **Monitor the System**:
   - Check contract events on Basescan
   - Monitor worker logs
   - Track user participation

3. **Prepare for Mainnet**:
   - Get security audit
   - Deploy to Base Mainnet
   - Update production environment

## 📞 Support

- **Base Documentation**: https://docs.base.org
- **Base Discord**: https://discord.gg/buildonbase
- **Contract Issues**: Check Basescan for transaction details

---

**Deployment completed successfully!** 🎉
EOF

    print_success "Deployment summary generated: DEPLOYMENT_SUMMARY.md"
}

# Main deployment function
main() {
    print_status "Starting complete deployment process..."
    
    # Check environment variables
    check_env_vars
    
    # Deploy smart contracts
    deploy_contracts
    
    # Update environment files
    update_env_files
    
    # Install frontend dependencies
    install_frontend_deps
    
    # Deploy worker service
    deploy_worker
    
    # Deploy frontend
    deploy_frontend
    
    # Test the system
    test_system
    
    # Generate summary
    generate_summary
    
    print_success "🎉 Complete deployment successful!"
    print_status "Check DEPLOYMENT_SUMMARY.md for details"
}

# Run main function
main "$@"
