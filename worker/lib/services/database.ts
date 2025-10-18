import { PrismaClient, BattleStatus, CastSide } from '@prisma/client';

// Enhanced Prisma client configuration for production
const createPrismaClient = () => {
  const databaseUrl = process.env.DATABASE_URL
  
  // Add connection pooling parameters if not already present
  const urlWithPooling = databaseUrl?.includes('?') 
    ? `${databaseUrl}&connection_limit=5&pool_timeout=60&connect_timeout=60`
    : `${databaseUrl}?connection_limit=5&pool_timeout=60&connect_timeout=60`

  return new PrismaClient({
    log: ['error', 'warn'], // Only log errors and warnings, no queries
    datasources: {
      db: {
        url: urlWithPooling,
      },
    },
    // Additional configuration for production stability
    ...(process.env.NODE_ENV === 'production' && {
      // Disable query engine logging in production
      log: ['error'],
      // Add error formatting
      errorFormat: 'minimal',
    }),
  })
}

// Global Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database service class
export class DatabaseService {
  private static instance: DatabaseService;
  public prisma: typeof prisma;

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
    imageUrl?: string;
    thumbnail?: string;
    startTime: Date;
    endTime: Date;
    durationHours: number;
    maxParticipants: number;
    debatePoints: any;
    overallScore?: number;
    balanceScore?: number;
    complexity?: string;
    controversyLevel?: string;
    debateId?: number; // Optional on-chain debate ID
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

  async getExpiredBattles() {
    return prisma.battle.findMany({
      where: {
        status: BattleStatus.ACTIVE,
        endTime: {
          lt: new Date()
        }
      },
      include: {
        participants: true,
        casts: true,
        winners: true
      }
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
      await prisma.battleHistory.upsert({
        where: { battleId },
        update: {
          totalParticipants: battle.participants.length,
          totalCasts: battle.casts.length,
          winnerAddress: battle.winners[0]?.user.address || null,
        },
        create: {
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

  async getUserById(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
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
    const participation = await prisma.battleParticipation.create({
      data: {
        userId,
        battleId,
      },
      include: {
        user: true,
        battle: true,
      },
    });

    return participation;
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
        likes: true, // Include likes for like count
        _count: {
          select: {
            likes: true // Get like count
          }
        }
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

  // User Points Management
  async awardParticipationPoints(userAddress: string, points: number = 10): Promise<number> {
    try {
      // First, ensure the user exists
      const user = await prisma.user.upsert({
        where: { address: userAddress },
        update: {
          points: {
            increment: points
          }
        },
        create: {
          address: userAddress,
          points: points
        }
      });

      console.log(`✅ Awarded ${points} points to user ${userAddress}. Total points: ${user.points}`);
      return user.points;
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  }

  async getUserPoints(userAddress: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { address: userAddress },
        select: { points: true }
      });

      return user?.points || 0;
    } catch (error) {
      console.error('Error getting user points:', error);
      return 0;
    }
  }

  async getUserProfile(userAddress: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { address: userAddress },
        include: {
          participations: {
            include: {
              battle: true
            },
            orderBy: {
              joinedAt: 'desc'
            },
            take: 10 // Last 10 participations
          },
          wins: {
            include: {
              battle: true
            },
            orderBy: {
              position: 'asc'
            }
          },
          casts: {
            include: {
              battle: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 10 // Last 10 casts
          }
        }
      });

      return user;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async getLeaderboard(limit: number = 10) {
    try {
      const users = await prisma.user.findMany({
        orderBy: {
          points: 'desc'
        },
        take: limit,
        select: {
          address: true,
          username: true,
          points: true,
          createdAt: true,
          participations: {
            select: {
              battle: {
                select: {
                  title: true,
                  category: true
                }
              }
            }
          },
          wins: {
            select: {
              position: true,
              prize: true,
              battle: {
                select: {
                  title: true,
                  category: true,
                  createdAt: true
                }
              }
            },
            orderBy: {
              battle: {
                createdAt: 'desc'
              }
            },
            take: 3 // Show last 3 wins
          }
        }
      });

      return users.map((user, index) => ({
        ...user,
        rank: index + 1,
        participationCount: user.participations.length,
        winCount: user.wins.length,
        recentWins: user.wins.map(win => ({
          battleTitle: win.battle.title,
          battleCategory: win.battle.category,
          position: win.position,
          prize: win.prize,
          wonAt: win.battle.createdAt
        }))
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
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
    const totalPointsAwarded = await prisma.user.aggregate({
      _sum: {
        points: true
      }
    });

    return {
      totalBattles,
      activeBattles,
      completedBattles,
      totalUsers,
      totalCasts,
      totalPointsAwarded: totalPointsAwarded._sum.points || 0,
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

  // Update battle insights
  async updateBattleInsights(battleId: string, insights: string) {
    return await prisma.battle.update({
      where: { id: battleId },
      data: { insights },
    });
  }

  // Link battle to on-chain debate
  async linkBattleToDebate(battleId: string, debateId: number) {
    return await prisma.battle.update({
      where: { id: battleId },
      data: { debateId },
    });
  }

  // Get debate ID for a battle
  async getDebateIdForBattle(battleId: string): Promise<number | null> {
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      select: { debateId: true },
    });
    return battle?.debateId || null;
  }

  // Get battle by debate ID
  async getBattleByDebateId(debateId: number) {
    return await prisma.battle.findFirst({
      where: { debateId },
      include: {
        participants: true,
      },
    });
  }
}

const databaseService = new DatabaseService();
export default databaseService;
