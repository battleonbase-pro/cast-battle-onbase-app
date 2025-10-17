"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const createPrismaClient = () => {
    const databaseUrl = process.env.DATABASE_URL;
    const urlWithPooling = databaseUrl?.includes('?')
        ? `${databaseUrl}&connection_limit=5&pool_timeout=60&connect_timeout=60`
        : `${databaseUrl}?connection_limit=5&pool_timeout=60&connect_timeout=60`;
    return new client_1.PrismaClient({
        log: ['error', 'warn'],
        datasources: {
            db: {
                url: urlWithPooling,
            },
        },
        ...(process.env.NODE_ENV === 'production' && {
            log: ['error'],
            errorFormat: 'minimal',
        }),
    });
};
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
class DatabaseService {
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    constructor() {
        this.prisma = exports.prisma;
    }
    async createBattle(battleData) {
        return await exports.prisma.battle.create({
            data: {
                ...battleData,
                status: client_1.BattleStatus.ACTIVE,
            },
        });
    }
    async getCurrentBattle() {
        return await exports.prisma.battle.findFirst({
            where: {
                status: client_1.BattleStatus.ACTIVE,
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
        return exports.prisma.battle.findMany({
            where: {
                status: client_1.BattleStatus.ACTIVE,
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
    async getBattleById(id) {
        return await exports.prisma.battle.findUnique({
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
    async completeBattle(battleId, winners) {
        await exports.prisma.battle.update({
            where: { id: battleId },
            data: { status: client_1.BattleStatus.COMPLETED },
        });
        if (winners.length > 0) {
            await exports.prisma.battleWin.createMany({
                data: winners.map(winner => ({
                    battleId,
                    userId: winner.userId,
                    position: winner.position,
                    prize: winner.prize,
                })),
            });
        }
        const battle = await exports.prisma.battle.findUnique({
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
            await exports.prisma.battleHistory.upsert({
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
    async getBattleHistory(limit = 10) {
        return await exports.prisma.battleHistory.findMany({
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
    async createOrUpdateUser(address, username) {
        return await exports.prisma.user.upsert({
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
    async getUserByAddress(address) {
        return await exports.prisma.user.findUnique({
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
    async getUserById(userId) {
        return await exports.prisma.user.findUnique({
            where: { id: userId },
        });
    }
    async joinBattle(userId, battleId) {
        const existingParticipation = await exports.prisma.battleParticipation.findUnique({
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
        const battle = await exports.prisma.battle.findUnique({
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
        if (battle.status !== client_1.BattleStatus.ACTIVE) {
            throw new Error('Battle is not active');
        }
        const participation = await exports.prisma.battleParticipation.create({
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
    async hasUserJoinedBattle(userId, battleId) {
        const participation = await exports.prisma.battleParticipation.findUnique({
            where: {
                userId_battleId: {
                    userId,
                    battleId,
                },
            },
        });
        return !!participation;
    }
    async createCast(userId, battleId, content, side) {
        const participation = await exports.prisma.battleParticipation.findUnique({
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
        return await exports.prisma.cast.create({
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
    async getCastsForBattle(battleId) {
        return await exports.prisma.cast.findMany({
            where: { battleId },
            include: {
                user: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async getConfig(key) {
        const config = await exports.prisma.systemConfig.findUnique({
            where: { key },
        });
        return config?.value;
    }
    async setConfig(key, value) {
        return await exports.prisma.systemConfig.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }
    async cleanupExpiredBattles() {
        const expiredBattles = await exports.prisma.battle.findMany({
            where: {
                status: client_1.BattleStatus.ACTIVE,
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
    async awardParticipationPoints(userAddress, points = 10) {
        try {
            const user = await exports.prisma.user.upsert({
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
        }
        catch (error) {
            console.error('Error awarding points:', error);
            throw error;
        }
    }
    async getUserPoints(userAddress) {
        try {
            const user = await exports.prisma.user.findUnique({
                where: { address: userAddress },
                select: { points: true }
            });
            return user?.points || 0;
        }
        catch (error) {
            console.error('Error getting user points:', error);
            return 0;
        }
    }
    async getUserProfile(userAddress) {
        try {
            const user = await exports.prisma.user.findUnique({
                where: { address: userAddress },
                include: {
                    participations: {
                        include: {
                            battle: true
                        },
                        orderBy: {
                            joinedAt: 'desc'
                        },
                        take: 10
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
                        take: 10
                    }
                }
            });
            return user;
        }
        catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }
    async getLeaderboard(limit = 10) {
        try {
            const users = await exports.prisma.user.findMany({
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
                        take: 3
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
        }
        catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    }
    async getBattleStats() {
        const totalBattles = await exports.prisma.battle.count();
        const activeBattles = await exports.prisma.battle.count({
            where: { status: client_1.BattleStatus.ACTIVE },
        });
        const completedBattles = await exports.prisma.battle.count({
            where: { status: client_1.BattleStatus.COMPLETED },
        });
        const totalUsers = await exports.prisma.user.count();
        const totalCasts = await exports.prisma.cast.count();
        const totalPointsAwarded = await exports.prisma.user.aggregate({
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
    async getRecentBattles(count) {
        return await exports.prisma.battle.findMany({
            where: {
                status: client_1.BattleStatus.COMPLETED,
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
    async getBattlesByDateRange(startDate, endDate) {
        return await exports.prisma.battle.findMany({
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
    async updateBattleInsights(battleId, insights) {
        return await exports.prisma.battle.update({
            where: { id: battleId },
            data: { insights },
        });
    }
    async linkBattleToDebate(battleId, debateId) {
        return await exports.prisma.battle.update({
            where: { id: battleId },
            data: { debateId },
        });
    }
    async getDebateIdForBattle(battleId) {
        const battle = await exports.prisma.battle.findUnique({
            where: { id: battleId },
            select: { debateId: true },
        });
        return battle?.debateId || null;
    }
    async getBattleByDebateId(debateId) {
        return await exports.prisma.battle.findFirst({
            where: { debateId },
            include: {
                participants: true,
            },
        });
    }
}
exports.DatabaseService = DatabaseService;
const databaseService = new DatabaseService();
exports.default = databaseService;
