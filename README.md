# 🥊 Cast Battle OnchainKit

A modern, onchain battle platform built with [OnchainKit](https://docs.base.org/onchainkit/getting-started) for Base network. Join daily debates on trending topics and earn $BATTLE tokens!

## 🚀 Features

### **OnchainKit Integration**
- **Official Base Support** - Native integration with Base wallet
- **Multi-Wallet Support** - MetaMask, Coinbase Wallet, WalletConnect
- **Professional UI** - Pre-built wallet connection components
- **Real-time Updates** - Live balance and connection status

### **Battle System**
- **Daily Topics** - AI-generated debate topics from trending news
- **Token Rewards** - Earn $BATTLE tokens for participation
- **Fair Selection** - Multiple winner selection methods
- **Transparent** - All transactions on-chain

### **AI-Powered**
- **Smart Topics** - AI curates relevant debate topics
- **Quality Moderation** - AI evaluates content quality
- **Dynamic Generation** - Topics generated from real news

## 🎯 Quick Start

1. **Clone and setup**
```bash
git clone <repository-url>
cd cast-battle-onbase
npm install
npm run setup
```

2. **Configure API keys**
Edit `.env.local` with your API keys:
- Get Alchemy API key: https://www.alchemy.com/
- Get News API key: https://newsapi.org/
- Get Google AI API key: https://makersuite.google.com/app/apikey

3. **Start development**
```bash
npm run dev
```

4. **Open your browser**
Visit `http://localhost:3000`

5. **Connect your wallet**
- Click "Connect Wallet"
- Choose your preferred wallet
- Start participating in battles!

## 🏗️ Architecture

### **Frontend**
- **Next.js 15** - React framework with App Router
- **OnchainKit** - Base's official SDK
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling

### **Backend**
- **API Routes** - Next.js API endpoints
- **News Service** - Trending topic fetching
- **Battle Service** - Battle management
- **AI Integration** - Smart content generation

### **Smart Contracts**
- **$BATTLE Token** - ERC-20 token for rewards
- **Battle Contract** - Battle participation logic
- **Base Network** - Ethereum L2 for low fees

## 🔧 Development

### **Project Structure**
```
cast-battle-onbase/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── page.tsx           # Main page
│   └── layout.tsx         # App layout
├── components/            # React components
├── lib/                   # Services and utilities
│   └── services/          # Business logic
├── contracts/             # Smart contracts
└── scripts/               # Deployment scripts
```

### **Key Components**
- **BattleTopicCard** - Display battle topics
- **BattleDetails** - Battle information modal
- **Wallet** - OnchainKit wallet connection
- **Token** - Token balance display
- **Transaction** - Transaction handling

## 🎮 How It Works

1. **Topic Generation** - AI fetches trending news and creates debate topics
2. **Battle Creation** - Users create battles from topics
3. **Participation** - Users join battles by paying entry fee
4. **Casting** - Users submit their opinions
5. **Voting** - Users vote on other casts
6. **Winner Selection** - AI or algorithm selects winner
7. **Rewards** - Winner receives $BATTLE tokens

## 🔑 Environment Variables

```bash
# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_alchemy_api_key

# News API Configuration
NEWS_API_KEY=your_news_api_key

# AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key

# Battle Token Contract
NEXT_PUBLIC_BATTLE_TOKEN_ADDRESS=0x...
```

## 📚 Documentation

- [OnchainKit Documentation](https://docs.base.org/onchainkit/getting-started)
- [Base Network](https://docs.base.org/)
- [Next.js App Router](https://nextjs.org/docs/app)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🎯 Roadmap

- [ ] Multi-agent AI architecture
- [ ] Smart contract deployment
- [ ] Farcaster Frame integration
- [ ] Mobile optimization
- [ ] Advanced battle types
- [ ] Community features

---

Built with ❤️ using OnchainKit and Base network