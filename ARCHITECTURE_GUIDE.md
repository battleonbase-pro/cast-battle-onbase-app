# Cast Battle Architecture Guide

## Overview

This is a **debate platform** where users submit arguments (casts) on trending news topics. The system uses **AI agents** to:
1. Generate daily debate topics from trending news
2. Moderate user submissions
3. Judge battles and determine winners
4. Integrate with blockchain (Base Sepolia) for prize distribution

---

## System Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │   Worker        │         │   Database      │
│  (Next.js)      │◄───────►│  (Node.js)      │◄───────►│  (PostgreSQL)   │
│                 │   SSE   │                 │         │                 │
│ - React UI      │   API   │ - Battle Logic  │         │ - Prisma ORM    │
│ - SSE Client    │         │ - AI Agents     │         │                 │
│ - Auth          │         │ - Timer System │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
         │                          │
         │                          │
         ▼                          ▼
┌─────────────────┐         ┌─────────────────┐
│   Smart Contract│         │   Google Cloud  │
│  (Base Sepolia) │         │   - Cloud Run   │
│                 │         │   - Secret Mgr  │
└─────────────────┘         └─────────────────┘
```

---

## Core Components

### 1. **Frontend (Next.js App)**

**Location**: `/app` directory

**Key Files**:
- `app/page.tsx` - Main battle page with SSE connection
- `app/api/battle/state-stream/route.ts` - SSE endpoint
- `components/SentimentChart.tsx` - Real-time sentiment visualization
- `components/BattleHistory.tsx` - Historical battle display

**Responsibilities**:
- Display current battle and cast submissions
- Connect to SSE stream for real-time updates
- Handle user authentication (Base, Farcaster)
- Show sentiment charts and battle history

**Real-time Updates**:
```typescript
// Frontend connects to SSE stream
const eventSource = new EventSource('/api/battle/state-stream');

// Receives events:
// - SENTIMENT_UPDATE: Updates chart data
// - CAST_SUBMITTED: Refreshes cast list
// - TIMER_UPDATE: Updates countdown
```

---

### 2. **Worker Service (Battle Manager)**

**Location**: `/worker` directory

**Key Files**:
- `worker/battle-completion-worker.ts` - Main worker entry point
- `worker/lib/services/battle-manager-db.ts` - Battle lifecycle management
- `worker/lib/services/database.ts` - Database operations
- `worker/lib/services/timer-broadcaster.ts` - SSE broadcasting

**Responsibilities**:
- Check for expired battles (timer-based, not polling)
- Complete battles using AI agents
- Generate new battles from trending news
- Broadcast updates via SSE

**Battle Lifecycle**:
```
1. Battle Created → Status: ACTIVE
2. Users submit casts → Stored in database
3. Battle expires → Status: COMPLETING
4. AI agents judge → Winner determined
5. On-chain payout → Status: COMPLETED
```

---

## AI Agent System

### Architecture Overview

The agent system uses **Google Gemini AI** to orchestrate multiple specialized agents:

```
┌─────────────────────────────────────┐
│      Agent Orchestrator              │
│  (Coordinates all agents)            │
└─────────────────────────────────────┘
         │
         ├──► News Curator Agent
         │    (Finds trending topics)
         │
         ├──► Debate Generator Agent
         │    (Creates debate topics)
         │
         ├──► Moderator Agent
         │    (Moderates casts)
         │
         └──► Judge Agent
              (Determines winners)
```

### Agent Classes

#### **1. BaseAgent** (`worker/lib/agents/base-agent.ts`)

**Purpose**: Base class for all AI agents with common functionality

**Key Methods**:
```typescript
class BaseAgent {
  // Generate text using Google Gemini
  async generateTextContent(prompt: string, temperature: number)
  
  // Generate structured JSON responses
  async generateStructuredContent(prompt: string, schema: object, temperature: number)
  
  // Log agent activity
  logActivity(message: string, details?: object)
}
```

**Design Pattern**: Template method pattern - all agents inherit common AI interaction logic

---

#### **2. News Curator Agent** (`worker/lib/agents/news-curator-agent.ts`)

**Purpose**: Finds trending news topics suitable for debates

**Workflow**:
1. Queries Serper API for trending news
2. Filters by relevance and debate potential
3. Returns curated topic with metadata

**Key Method**:
```typescript
async findDailyBattleTopic(): Promise<Topic> {
  // 1. Search trending news
  // 2. Filter for debate-worthy topics
  // 3. Return best candidate
}
```

---

#### **3. Debate Generator Agent** (`worker/lib/agents/debate-generator-agent.ts`)

**Purpose**: Converts news topics into debate questions

**Workflow**:
1. Takes curated news topic
2. Generates debatable question (Support/Oppose sides)
3. Creates debate points for both sides
4. Validates quality

**Key Method**:
```typescript
async generateDebateTopic(topic: Topic): Promise<DebateTopic> {
  // Uses Gemini to create:
  // - Title: "Should X be allowed?"
  // - Support points: [arg1, arg2, arg3]
  // - Oppose points: [arg1, arg2, arg3]
}
```

**Example Output**:
```json
{
  "title": "Should remote work be the default?",
  "supportPoints": ["Increased productivity", "Better work-life balance"],
  "opposePoints": ["Loss of collaboration", "Difficulty maintaining culture"]
}
```

---

#### **4. Moderator Agent** (`worker/lib/agents/moderator-agent.ts`)

**Purpose**: Evaluates cast submissions for quality and appropriateness

**Workflow**:
1. Receives cast content and battle topic
2. Evaluates:
   - **Appropriateness**: Is it on-topic? Is it appropriate?
   - **Quality Score** (1-10): Argument strength, clarity
   - **Relevance Score** (1-10): Topic alignment
   - **Engagement Score** (1-10): Discussion potential

**Key Method**:
```typescript
async moderateCast(castContent: string, battleTopic: Topic): Promise<ModerationResult> {
  // Returns:
  // {
  //   isAppropriate: boolean,
  //   qualityScore: number,
  //   relevanceScore: number,
  //   engagementScore: number
  // }
}
```

**Batch Processing**:
```typescript
async moderateBattleCasts(casts: Cast[], battleData: Battle): Promise<BatchModerationResult> {
  // Moderates all casts in parallel for efficiency
}
```

---

#### **5. Judge Agent** (`worker/lib/agents/judge-agent.ts`)

**Purpose**: Determines battle winner using multiple strategies

**Winner Selection Methods**:

1. **Random** (`selectRandomWinner`):
   - Randomly selects from appropriate casts
   - Fair but not merit-based

2. **Votes** (`selectVoteWinner`):
   - Selects based on community votes
   - Currently simulated (not fully implemented)

3. **Quality** (`selectQualityWinner`):
   - Uses LLM to analyze cast quality
   - Selects best quality cast
   - **Expensive** (requires LLM call per evaluation)

4. **Hybrid** (`selectOptimizedHybridWinner`) ⭐ **DEFAULT**:
   - **Non-LLM scoring** (fast, cheap)
   - Calculates scores for:
     - Quality (35%): Length, structure, evidence indicators
     - Relevance (25%): Keyword overlap with topic
     - Engagement (15%): Questions, exclamations, controversy
     - Likes (15%): Community engagement (logarithmic scaling)
     - Originality (10%): Uniqueness vs other casts
   - Groups casts by side (SUPPORT/OPPOSE)
   - Selects winning group (highest average score)
   - Randomly picks from top 3 of winning group
   - **Single LLM call** for insights generation only

**Hybrid Winner Selection Algorithm**:
```typescript
async selectOptimizedHybridWinner(battleData, casts) {
  // Step 1: Calculate non-LLM scores for all casts
  casts.forEach(cast => {
    cast.totalScore = (
      calculateQualityScore(cast.content) * 0.35 +
      calculateRelevanceScore(cast.content, battleData) * 0.25 +
      calculateEngagementScore(cast.content) * 0.15 +
      calculateLikeScore(cast.likes) * 0.15 +
      calculateOriginalityScore(cast.content, allCasts) * 0.10
    );
  });
  
  // Step 2: Group by side
  const supportCasts = casts.filter(c => c.side === 'SUPPORT');
  const opposeCasts = casts.filter(c => c.side === 'OPPOSE');
  
  // Step 3: Calculate group averages
  const supportScore = average(supportCasts.map(c => c.totalScore));
  const opposeScore = average(opposeCasts.map(c => c.totalScore));
  
  // Step 4: Select winning group
  const winningGroup = supportScore > opposeScore ? supportCasts : opposeCasts;
  
  // Step 5: Get top 3 from winning group
  const top3 = winningGroup.sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);
  
  // Step 6: Random selection from top 3
  return top3[Math.floor(Math.random() * top3.length)];
}
```

**Why Hybrid?**:
- **Fast**: No LLM calls for scoring (only for insights)
- **Fair**: Random selection from top performers prevents gaming
- **Transparent**: Scoring criteria are explicit
- **Cost-effective**: Single LLM call for insights vs. many for scoring

---

#### **6. Agent Orchestrator** (`worker/lib/agents/agent-orchestrator.ts`)

**Purpose**: Coordinates all agents in workflows

**Key Workflows**:

1. **Daily Battle Generation**:
```typescript
async generateDailyBattleTopic() {
  // Step 1: News Curator finds topic
  const topic = await this.newsCurator.findDailyBattleTopic();
  
  // Step 2: Debate Generator creates debate
  const debate = await this.debateGenerator.generateDebateTopic(topic);
  
  // Step 3: Quality analysis
  const quality = await this.debateGenerator.analyzeDebateQuality(debate);
  
  return { topic, debate, quality };
}
```

2. **Battle Completion**:
```typescript
async completeBattle(battleData, casts, winnerMethod = 'hybrid') {
  // Step 1: Batch moderate all casts
  const moderationResults = await this.moderator.moderateBattleCasts(casts, battleData);
  
  // Step 2: Judge determines winner
  const judgment = await this.judge.judgeBattle(battleData, casts, moderationResults, winnerMethod);
  
  // Step 3: Generate statistics
  const statistics = await this.judge.generateBattleStatistics(...);
  
  return { moderationResults, judgment, statistics };
}
```

---

## Data Flow

### Battle Creation Flow

```
1. Worker Cron Job (every 30 seconds)
   ↓
2. Check for expired battles
   ↓
3. Complete expired battle (if exists)
   ↓
4. Check if new battle needed
   ↓
5. Agent Orchestrator.generateDailyBattleTopic()
   ↓
6. News Curator → Finds trending topic
   ↓
7. Debate Generator → Creates debate question
   ↓
8. Database → Creates new Battle record
   ↓
9. SSE Broadcast → Frontend receives new battle
```

### Cast Submission Flow

```
1. User submits cast (Frontend)
   ↓
2. POST /api/battle/submit-cast
   ↓
3. Database → Save cast
   ↓
4. Moderator Agent → Moderate cast (async)
   ↓
5. SSE Broadcast → CAST_SUBMITTED event
   ↓
6. Frontend → Updates cast list
   ↓
7. Calculate sentiment → Broadcast SENTIMENT_UPDATE
   ↓
8. Frontend → Updates sentiment chart
```

### Battle Completion Flow

```
1. Battle expires (timer-based)
   ↓
2. BattleManagerDB.handleBattleCompletion()
   ↓
3. Agent Orchestrator.completeBattle()
   ↓
4. Moderator Agent → Batch moderate all casts
   ↓
5. Judge Agent → Determine winner (hybrid method)
   ↓
6. Database → Save winner, update battle status
   ↓
7. On-chain Debate Oracle → Submit winner to contract
   ↓
8. Smart Contract → Distribute prizes
   ↓
9. Database → Mark battle as COMPLETED
   ↓
10. SSE Broadcast → Battle transition event
```

---

## Real-Time Communication (SSE)

### Architecture

**Frontend** (`app/api/battle/state-stream/route.ts`):
- Establishes SSE connection
- Proxies timer updates from worker
- Broadcasts events to connected clients

**Worker** (`worker/lib/services/timer-broadcaster.ts`):
- Maintains active SSE connections
- Broadcasts timer updates
- Broadcasts battle transitions

**Event Types**:
```typescript
// Timer updates
{ type: 'TIMER_UPDATE', data: { timeRemaining: number } }

// Sentiment updates
{ type: 'SENTIMENT_UPDATE', data: { sentiment: { support, oppose, ... } } }

// Cast submissions
{ type: 'CAST_SUBMITTED', data: { cast: {...} } }

// Battle transitions
{ type: 'BATTLE_TRANSITION', data: { battle: {...} } }
```

### Connection Flow

```
Frontend → GET /api/battle/state-stream
  ↓
Creates ReadableStream
  ↓
Stores connection in battle-broadcaster
  ↓
Worker broadcasts → battle-broadcaster
  ↓
All connected clients receive update
```

---

## Blockchain Integration

### Smart Contract

**Location**: `contracts/contracts/MinimalDebatePool.sol`

**Purpose**: Manages debate pools, prize distribution, and refunds

**Key Functions**:
```solidity
// Distribute winner prize (20% platform fee)
function distributeWinner(uint256 debateId, address winner, uint256 amount)

// Withdraw platform fees
function withdrawPlatformFees()

// Refund participants (if debate paused)
function refundParticipants(uint256 debateId, address[] recipients)
```

### Oracle Integration

**Location**: `worker/lib/services/debate-oracle.ts`

**Purpose**: Submits battle results to on-chain contract

**Flow**:
```
1. Battle completes → Winner determined
2. Oracle creates signed message (EIP-712)
3. Oracle submits to contract
4. Contract verifies signature
5. Contract distributes prizes
```

**Oracle Signature**:
```typescript
// EIP-712 structured data signing
const domain = {
  name: 'MinimalDebatePool',
  version: '1',
  chainId: 84532, // Base Sepolia
  verifyingContract: contractAddress
};

const types = {
  DebateResult: [
    { name: 'debateId', type: 'uint256' },
    { name: 'winner', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ]
};

const signature = await wallet.signTypedData(domain, types, message);
```

---

## Database Schema

**Location**: `prisma/schema.prisma`

**Key Models**:

```prisma
model Battle {
  id          String   @id @default(cuid())
  title       String
  description String
  status      BattleStatus  // ACTIVE, COMPLETING, COMPLETED
  startTime   DateTime
  endTime     DateTime
  casts       Cast[]
  participants BattleParticipation[]
  winners     BattleWin[]
}

model Cast {
  id        String   @id @default(cuid())
  content   String
  side      CastSide  // SUPPORT or OPPOSE
  qualityScore   Int?
  relevanceScore Int?
  isAppropriate  Boolean
  battle    Battle   @relation(...)
  user      User     @relation(...)
  likes     CastLike[]
}

model BattleWin {
  id        String   @id @default(cuid())
  battleId  String
  userId    String
  position  Int      // 1st, 2nd, 3rd place
  prize     String?
}
```

---

## Deployment Architecture

### Google Cloud Run

**Frontend**:
- Service: `news-debate-app`
- Region: `us-central1`
- URL: `https://news-debate-app-3lducklitq-uc.a.run.app`

**Worker**:
- Service: `battle-worker`
- Region: `us-central1`
- Runs battle completion checks
- Handles AI agent orchestration

### Secrets Management

**GCP Secret Manager**:
- `database-url`: PostgreSQL connection
- `google-generative-ai-api-key`: Gemini API key
- `serper-api-key`: News search API
- `debate-pool-contract-address`: Smart contract address
- `oracle-private-key`: Oracle wallet private key

---

## Key Design Decisions

### 1. **Timer-Based Battle Completion**
- **Why**: More efficient than polling
- **How**: Worker sets timer when battle created, completes when timer fires
- **Benefit**: No wasted CPU cycles checking database

### 2. **Hybrid Winner Selection**
- **Why**: Balance between fairness and cost
- **How**: Non-LLM scoring + random selection from top 3
- **Benefit**: Fast, transparent, fair, cost-effective

### 3. **SSE for Real-Time Updates**
- **Why**: Better than polling for live data
- **How**: Server-Sent Events stream updates to frontend
- **Benefit**: Low latency, efficient, works with HTTP/2

### 4. **Agent Orchestrator Pattern**
- **Why**: Centralized workflow coordination
- **How**: Single class coordinates all agents
- **Benefit**: Easy to trace, debug, and extend

### 5. **Batch Moderation**
- **Why**: More efficient than individual calls
- **How**: Moderator processes all casts in parallel
- **Benefit**: Faster battle completion

---

## Performance Optimizations

1. **Non-LLM Scoring**: Hybrid method avoids expensive LLM calls for scoring
2. **Batch Processing**: Moderator processes casts in parallel
3. **Connection Pooling**: Database connections reused
4. **SSE Broadcasting**: Efficient real-time updates
5. **Timer-Based Scheduling**: No polling overhead

---

## Error Handling

### Agent Failures
- **Fallback**: If LLM call fails, falls back to random selection
- **Retry Logic**: Automatic retries with exponential backoff
- **Logging**: All agent activities logged for debugging

### Database Failures
- **Connection Retry**: Automatic reconnection
- **Transaction Rollback**: Failed operations rolled back
- **Graceful Degradation**: Frontend shows cached data if DB unavailable

### Blockchain Failures
- **Retry Logic**: Oracle retries failed transactions
- **Error Logging**: All on-chain errors logged
- **Manual Override**: Admin can manually trigger payouts

---

## Testing

### Agent Testing
```typescript
// Test all agents
const orchestrator = new AgentOrchestrator(apiKey);
const results = await orchestrator.testAllAgents();
```

### Battle Flow Testing
- Unit tests for individual agents
- Integration tests for orchestrator workflows
- End-to-end tests for complete battle lifecycle

---

## Future Improvements

1. **Caching**: Cache moderation results for similar casts
2. **Rate Limiting**: Prevent abuse of AI agents
3. **A/B Testing**: Test different winner selection methods
4. **Analytics**: Track agent performance and costs
5. **Multi-Chain**: Support multiple blockchains

---

## Code Organization

```
/app                    # Next.js frontend
  /api                  # API routes (SSE, battle, casts)
  /components           # React components
  /contexts            # React contexts (Auth)

/worker                 # Worker service
  /lib
    /agents            # AI agents
    /services          # Business logic
      - battle-manager-db.ts
      - database.ts
      - timer-broadcaster.ts
      - debate-oracle.ts
  battle-completion-worker.ts  # Main entry point

/contracts             # Smart contracts
  /contracts           # Solidity files
  /scripts             # Deployment scripts

/prisma                 # Database schema
  schema.prisma        # Prisma schema
```

---

## Getting Started

1. **Set up environment variables** (`.env`):
   ```
   DATABASE_URL=postgresql://...
   GOOGLE_GENERATIVE_AI_API_KEY=...
   SERPER_API_KEY=...
   PRIVATE_KEY=0x...
   ORACLE_ADDRESS=0x...
   ```

2. **Run database migrations**:
   ```bash
   npx prisma migrate dev
   ```

3. **Start frontend**:
   ```bash
   npm run dev
   ```

4. **Start worker**:
   ```bash
   cd worker
   npm run dev
   ```

5. **Deploy to GCP**:
   ```bash
   ./deploy-frontend-gcp.sh
   ./worker/deploy-gcp.sh
   ```

---

## Key Takeaways for Software Engineers

1. **Agent Pattern**: Each agent is a specialized class with a single responsibility
2. **Orchestrator Pattern**: Central coordinator manages complex workflows
3. **Real-Time Updates**: SSE provides efficient server-to-client streaming
4. **Cost Optimization**: Non-LLM scoring reduces API costs significantly
5. **Scalability**: Timer-based scheduling scales better than polling
6. **Error Handling**: Fallbacks ensure system remains functional
7. **Type Safety**: TypeScript throughout for better maintainability

---

This architecture enables a **scalable, cost-effective debate platform** with AI-powered moderation and judging, real-time updates, and blockchain integration for transparent prize distribution.

