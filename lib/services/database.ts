import { PrismaClient, BattleStatus, CastSide } from '@prisma/client';

// Global Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database service class
export class DatabaseService {
  private static instance: DatabaseService;
  public prisma: PrismaClient;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  constructor() {
    this.prisma = prisma;
  }

  // Battle Management
  async createBattle(battleData: {
    title: string;
    description: string;
    category: string;
    source: string;
    sourceUrl?: string;
    startTime: Date;
    endTime: Date;
    durationHours: number;
    maxParticipants: number;
    debatePoints: any;
    overallScore?: number;
    balanceScore?: number;
    complexity?: string;
    controversyLevel?: string;
  }) {
    return await prisma.battle.create({
      data: {
        ...battleData,
        status: BattleStatus.ACTIVE,
      },
    });
  }

  async getCurrentBattle() {
    return await prisma.battle.findFirst({
      where: {
        status: BattleStatus.ACTIVE,
        endTime: {
          gt: new Date(),
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        casts: {
          include: {
            user: true,
          },
        },
        winners: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getBattleById(id: string) {
    return await prisma.battle.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        casts: {
          include: {
            user: true,
          },
        },
        winners: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async completeBattle(battleId: string, winners: Array<{ userId: string; position: number; prize?: string }>) {
    // Update battle status
    await prisma.battle.update({
      where: { id: battleId },
      data: { status: BattleStatus.COMPLETED },
    });

    // Create battle wins
    if (winners.length > 0) {
      await prisma.battleWin.createMany({
        data: winners.map(winner => ({
          battleId,
          userId: winner.userId,
          position: winner.position,
          prize: winner.prize,
        })),
      });
    }

    // Create battle history entry
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: true,
        casts: true,
        winners: {
          include: {
            user: true,
          },
        },
      },
    });

    if (battle) {
      await prisma.battleHistory.create({
        data: {
          battleId,
          totalParticipants: battle.participants.length,
          totalCasts: battle.casts.length,
          winnerAddress: battle.winners[0]?.user.address || null,
        },
      });
    }

    return battle;
  }

  async getBattleHistory(limit: number = 10) {
    return await prisma.battleHistory.findMany({
      include: {
        battle: {
          include: {
            winners: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: limit,
    });
  }

  // User Management
  async createOrUpdateUser(address: string, username?: string) {
    return await prisma.user.upsert({
      where: { address },
      update: {
        username,
        updatedAt: new Date(),
      },
      create: {
        address,
        username,
      },
    });
  }

  async getUserByAddress(address: string) {
    return await prisma.user.findUnique({
      where: { address },
      include: {
        participations: {
          include: {
            battle: true,
          },
        },
        wins: {
          include: {
            battle: true,
          },
        },
        casts: {
          include: {
            battle: true,
          },
        },
      },
    });
  }

  // Battle Participation
  async joinBattle(userId: string, battleId: string) {
    // Check if user already joined
    const existingParticipation = await prisma.battleParticipation.findUnique({
      where: {
        userId_battleId: {
          userId,
          battleId,
        },
      },
    });

    if (existingParticipation) {
      throw new Error('User already joined this battle');
    }

    // Check battle capacity
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: true,
      },
    });

    if (!battle) {
      throw new Error('Battle not found');
    }

    if (battle.participants.length >= battle.maxParticipants) {
      throw new Error('Battle is full');
    }

    if (battle.status !== BattleStatus.ACTIVE) {
      throw new Error('Battle is not active');
    }

    // Add participant
    return await prisma.battleParticipation.create({
      data: {
        userId,
        battleId,
      },
      include: {
        user: true,
        battle: true,
      },
    });
  }

  async hasUserJoinedBattle(userId: string, battleId: string) {
    const participation = await prisma.battleParticipation.findUnique({
      where: {
        userId_battleId: {
          userId,
          battleId,
        },
      },
    });
    return !!participation;
  }

  // Cast Management
  async createCast(userId: string, battleId: string, content: string, side: CastSide) {
    // Verify user has joined the battle
    const participation = await prisma.battleParticipation.findUnique({
      where: {
        userId_battleId: {
          userId,
          battleId,
        },
      },
    });

    if (!participation) {
      throw new Error('User must join battle before casting');
    }

    return await prisma.cast.create({
      data: {
        userId,
        battleId,
        content,
        side,
      },
      include: {
        user: true,
        battle: true,
      },
    });
  }

  async getCastsForBattle(battleId: string) {
    return await prisma.cast.findMany({
      where: { battleId },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // System Configuration
  async getConfig(key: string) {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });
    return config?.value;
  }

  async setConfig(key: string, value: string) {
    return await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  // Cleanup expired battles
  async cleanupExpiredBattles() {
    const expiredBattles = await prisma.battle.findMany({
      where: {
        status: BattleStatus.ACTIVE,
        endTime: {
          lt: new Date(),
        },
      },
    });

    for (const battle of expiredBattles) {
      await this.completeBattle(battle.id, []);
    }

    return expiredBattles.length;
  }

  // Statistics
  async getBattleStats() {
    const totalBattles = await prisma.battle.count();
    const activeBattles = await prisma.battle.count({
      where: { status: BattleStatus.ACTIVE },
    });
    const completedBattles = await prisma.battle.count({
      where: { status: BattleStatus.COMPLETED },
    });
    const totalUsers = await prisma.user.count();
    const totalCasts = await prisma.cast.count();

    return {
      totalBattles,
      activeBattles,
      completedBattles,
      totalUsers,
      totalCasts,
    };
  }

  // Get recent battles for similarity checking
  async getRecentBattles(count: number) {
    return await prisma.battle.findMany({
      where: {
        status: BattleStatus.COMPLETED,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: count,
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });
  }

  // Get battles by date range
  async getBattlesByDateRange(startDate: Date, endDate: Date) {
    return await prisma.battle.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

const databaseService = new DatabaseService();
export default databaseService;
