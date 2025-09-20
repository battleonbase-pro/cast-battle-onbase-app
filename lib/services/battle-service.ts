interface Battle {
  id: string;
  topic: string;
  startTime: Date;
  endTime: Date;
  status: 'active' | 'voting' | 'ended';
  participants: string[];
  casts: string[];
  votes: string[];
  winner: string | null;
  winnerMethod: string | null;
  battleId: string;
  source: string;
  category: string;
}

interface Cast {
  id: string;
  userId: string;
  content: string;
  submittedAt: string;
}

class BattleService {
  private battles = new Map<string, Battle>();
  private casts = new Map<string, Cast>();
  private votes = new Map<string, any>();

  createBattle(topic: any, duration = 24 * 60 * 60 * 1000): Battle {
    const battleId = `battle_${Date.now()}`;
    const battle: Battle = {
      id: battleId,
      topic: topic.title,
      startTime: new Date(),
      endTime: new Date(Date.now() + duration),
      status: 'active',
      participants: [],
      casts: [],
      votes: [],
      winner: null,
      winnerMethod: null,
      battleId,
      source: topic.source,
      category: topic.category
    };
    
    this.battles.set(battleId, battle);
    return battle;
  }

  getCurrentBattle(): Battle | null {
    // Find the most recent active battle
    const activeBattles = Array.from(this.battles.values())
      .filter(battle => battle.status === 'active')
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
    return activeBattles[0] || null;
  }

  submitCast(battleId: string, cast: Cast): boolean {
    const battle = this.battles.get(battleId);
    if (!battle) return false;

    this.casts.set(cast.id, cast);
    battle.casts.push(cast.id);
    
    if (!battle.participants.includes(cast.userId)) {
      battle.participants.push(cast.userId);
    }

    return true;
  }

  submitVote(battleId: string, userId: string, castId: string): boolean {
    const battle = this.battles.get(battleId);
    if (!battle) return false;

    const voteId = `vote_${userId}_${castId}`;
    const vote = {
      id: voteId,
      userId,
      castId,
      battleId,
      timestamp: new Date().toISOString()
    };

    this.votes.set(voteId, vote);
    battle.votes.push(voteId);

    return true;
  }

  endBattle(battleId: string, method = 'random'): Battle | null {
    const battle = this.battles.get(battleId);
    if (!battle) return null;

    if (battle.status === 'ended') return battle;

    // Select winner based on method
    battle.winner = this.selectWinner(battle, method);
    battle.winnerMethod = method;
    battle.status = 'ended';

    return battle;
  }

  private selectWinner(battle: Battle, method: string): string | null {
    if (battle.casts.length === 0) return null;

    switch (method) {
      case 'random':
        return this.selectRandomWinner(battle);
      case 'votes':
        return this.selectVoteWinner(battle);
      default:
        return this.selectRandomWinner(battle);
    }
  }

  private selectRandomWinner(battle: Battle): string | null {
    if (battle.casts.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * battle.casts.length);
    return battle.casts[randomIndex];
  }

  private selectVoteWinner(battle: Battle): string | null {
    if (battle.votes.length === 0) return this.selectRandomWinner(battle);

    // Count votes for each cast
    const voteCounts = new Map<string, number>();
    
    battle.votes.forEach(voteId => {
      const vote = this.votes.get(voteId);
      if (vote) {
        const count = voteCounts.get(vote.castId) || 0;
        voteCounts.set(vote.castId, count + 1);
      }
    });

    // Find cast with most votes
    let maxVotes = 0;
    let winnerCastId = null;

    voteCounts.forEach((votes, castId) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        winnerCastId = castId;
      }
    });

    return winnerCastId || this.selectRandomWinner(battle);
  }

  getBattleResults(battleId: string): any {
    const battle = this.battles.get(battleId);
    if (!battle) return null;

    const battleCasts = battle.casts.map(castId => this.casts.get(castId)).filter(Boolean);
    const battleVotes = battle.votes.map(voteId => this.votes.get(voteId)).filter(Boolean);

    return {
      battle,
      casts: battleCasts,
      votes: battleVotes,
      participantCount: battle.participants.length,
      castCount: battle.casts.length,
      voteCount: battle.votes.length
    };
  }
}

export default new BattleService();
