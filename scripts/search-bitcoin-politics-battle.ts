import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 SEARCHING FOR BITCOIN & POLITICS BATTLE");
    console.log("   Looking for the specific battle mentioned");
    
    // Search for battles with "Trump" or "Politics" in title
    const battles = await prisma.battle.findMany({
      where: {
        OR: [
          {
            title: {
              contains: "Trump",
              mode: 'insensitive'
            }
          },
          {
            title: {
              contains: "Politics",
              mode: 'insensitive'
            }
          },
          {
            title: {
              contains: "crypto",
              mode: 'insensitive'
            }
          },
          {
            title: {
              contains: "rally",
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        casts: {
          include: {
            user: true,
            likes: true,
            _count: {
              select: {
                likes: true
              }
            }
          }
        },
        winners: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n📊 FOUND ${battles.length} BATTLES:`);

    battles.forEach((battle, index) => {
      console.log(`\n${index + 1}. BATTLE DETAILS:`);
      console.log(`   ID: ${battle.id}`);
      console.log(`   Title: ${battle.title}`);
      console.log(`   Status: ${battle.status}`);
      console.log(`   Start Time: ${battle.startTime}`);
      console.log(`   End Time: ${battle.endTime}`);
      console.log(`   Created: ${battle.createdAt}`);
      console.log(`   Updated: ${battle.updatedAt}`);

      console.log(`   Participants: ${battle.participants.length}`);
      console.log(`   Casts: ${battle.casts.length}`);
      console.log(`   Winners: ${battle.winners.length}`);

      // Check if this matches the description
      const hasTrump = battle.title.toLowerCase().includes('trump');
      const hasPolitics = battle.title.toLowerCase().includes('politics');
      const hasCrypto = battle.title.toLowerCase().includes('crypto');
      const hasRally = battle.title.toLowerCase().includes('rally');
      
      if (hasTrump || hasPolitics || hasCrypto || hasRally) {
        console.log(`   🎯 MATCHES CRITERIA: Trump=${hasTrump}, Politics=${hasPolitics}, Crypto=${hasCrypto}, Rally=${hasRally}`);
        
        if (battle.participants.length === 1 && battle.casts.length === 1 && battle.winners.length === 0) {
          console.log(`   ⚠️ EXACT MATCH: 1 participant, 1 cast, 0 winners`);
        }
      }
    });

    // Also check recent battles
    console.log("\n🔍 RECENT BATTLES (Last 10):");
    const recentBattles = await prisma.battle.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      include: {
        participants: true,
        casts: true,
        winners: true
      }
    });

    recentBattles.forEach((battle, index) => {
      console.log(`\n${index + 1}. ${battle.title}`);
      console.log(`   Status: ${battle.status}`);
      console.log(`   Participants: ${battle.participants.length}`);
      console.log(`   Casts: ${battle.casts.length}`);
      console.log(`   Winners: ${battle.winners.length}`);
      console.log(`   Created: ${battle.createdAt.toISOString().split('T')[0]}`);
    });

  } catch (error) {
    console.error("❌ Database analysis failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
