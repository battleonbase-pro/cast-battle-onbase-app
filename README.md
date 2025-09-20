# Cast Battle OnBase

<div align="center">
  <img src="./public/Base_basemark_blue.png" alt="Base Logo" width="200"/>
  
  **AI-Powered Debate Battles on Base Network**
  
  [![Base Network](https://img.shields.io/badge/Network-Base-blue)](https://base.org)
  [![Next.js](https://img.shields.io/badge/Framework-Next.js-black)](https://nextjs.org)
  [![OnchainKit](https://img.shields.io/badge/SDK-OnchainKit-green)](https://docs.base.org/onchainkit)
  [![AI Powered](https://img.shields.io/badge/AI-Gemini-orange)](https://ai.google.dev)
</div>

## Overview

Cast Battle OnBase transforms trending global news into engaging debate battles on the Base network. Users participate through Farcaster Frames, submit their arguments, and compete for $BATTLE tokens. Our multi-agent AI system curates high-impact news, generates balanced debate topics, and moderates content quality.

## Architecture

### Core Components

- **Frontend**: Next.js 15 with OnchainKit integration
- **AI System**: Multi-agent architecture using Google Gemini
- **Blockchain**: Base network with ERC-20 $BATTLE token
- **Frames**: Interactive Farcaster Frame endpoints
- **Data**: Real-time news from NewsAPI

### AI Agent System

Our sophisticated AI system consists of specialized agents:

1. **News Curator Agent** - Discovers and filters high-impact global politics and crypto news
2. **Debate Generator Agent** - Transforms news into balanced debate topics with compelling arguments
3. **Moderator Agent** - Evaluates content quality and appropriateness
4. **Judge Agent** - Determines battle winners using hybrid scoring algorithms

## Features

### 🎯 Battle System
- **Daily Battles**: Fresh topics generated every 12 hours
- **Real-time Participation**: Join battles via Farcaster Frames
- **Token Rewards**: Win $BATTLE tokens for quality arguments
- **AI Moderation**: Automated content quality assessment

### 🔗 OnchainKit Integration
- **Wallet Connection**: Seamless Base wallet integration
- **Token Operations**: Native $BATTLE token handling
- **Transaction Management**: Built-in transaction processing
- **Multi-wallet Support**: MetaMask, Coinbase Wallet, WalletConnect

### 📱 Farcaster Frames
- **Interactive Cards**: Rich Frame experiences
- **Battle Participation**: Join battles directly from Farcaster
- **Cast Submission**: Submit arguments through Frames
- **Real-time Updates**: Live battle status and results

## Tokenomics

**$BATTLE Token (ERC-20 on Base)**
- **Total Supply**: 1,000,000,000 tokens
- **Distribution**:
  - 40% Battle rewards (400M tokens)
  - 25% Community treasury (250M tokens)
  - 20% Team allocation (200M tokens)
  - 15% Project treasury (150M tokens)

## Quick Start

### Prerequisites

- Node.js 18+
- Base network access
- NewsAPI key (free tier available)
- Google Gemini API key
- Alchemy API key

### Installation

```bash
# Clone the repository
git clone https://github.com/battleonbase-pro/cast-battle-onbase-app.git
cd cast-battle-onbase-app

# Install dependencies
npm install

# Set up environment variables
cp .env.sample .env
# Edit .env with your API keys
```

### Environment Setup

Required API keys in `.env`:

```env
# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_alchemy_api_key

# News API Configuration  
NEWS_API_KEY=your_news_api_key

# AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_api_key

# Contract Address (set after deployment)
NEXT_PUBLIC_BATTLE_TOKEN_ADDRESS=
```

### Development

```bash
# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

### Smart Contract Deployment

```bash
# Deploy to Base mainnet
npm run deploy:token

# Deploy to Base Sepolia testnet
npm run deploy:testnet

# Run tests
npm test
```

## API Endpoints

### News & Topics
- `GET /api/news/trending-topics` - Current battle topic
- `POST /api/battle/create-battle` - Create new battle

### Farcaster Frames
- `GET /api/frame/battle-announcement` - Main battle frame
- `POST /api/frame/join-battle` - Join battle
- `POST /api/frame/submit-cast` - Submit argument
- `POST /api/frame/generate-topic` - Generate new topic

## How It Works

### 1. News Curation
Our News Curator Agent scans high-impact global politics and cryptocurrency news, scoring articles for relevance and engagement potential.

### 2. Debate Generation
The Debate Generator Agent transforms curated news into balanced debate questions with compelling pro/con arguments using advanced AI analysis.

### 3. Battle Participation
Users join battles through Farcaster Frames, submit their arguments, and compete for $BATTLE tokens.

### 4. AI Moderation
The Moderator Agent evaluates content quality, appropriateness, and relevance during battle completion.

### 5. Winner Selection
The Judge Agent determines winners using hybrid scoring algorithms combining quality, engagement, and AI analysis.

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Blockchain**: Base network, OnchainKit, Viem, Wagmi
- **AI**: Google Gemini, Vercel AI SDK, Zod schemas
- **Data**: NewsAPI, Axios
- **Styling**: CSS Modules, Base design system

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [Base Docs](https://docs.base.org)
- **OnchainKit**: [OnchainKit Docs](https://docs.base.org/onchainkit)
- **Issues**: [GitHub Issues](https://github.com/battleonbase-pro/cast-battle-onbase-app/issues)

## Roadmap

- [ ] Enhanced AI moderation algorithms
- [ ] Advanced tokenomics features
- [ ] Mobile app development
- [ ] Cross-chain integration
- [ ] Community governance system

---

<div align="center">
  <p>Built with ❤️ on <a href="https://base.org">Base</a></p>
  <p>Powered by <a href="https://docs.base.org/onchainkit">OnchainKit</a></p>
</div>