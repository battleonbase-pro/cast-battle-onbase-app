import { NextRequest, NextResponse } from 'next/server';
import newsService from '@/lib/services/news-service';
import battleService from '@/lib/services/battle-service';

export async function GET(_request: NextRequest) {
  try {
    // Get current battle or create new one
    let battle = battleService.getCurrentBattle();
    
    if (!battle) {
      // Create new battle with daily topic
      const topic = await newsService.getDailyBattleTopic();
      battle = await battleService.createBattle(topic, 24 * 60 * 60 * 1000);
      // Add topic details to battle
      battle.topicInfo = topic;
      battle.category = topic.category;
      battle.source = topic.source;
      battle.debatePoints = topic.debatePoints;
    }
    
    // Create Frame HTML
    const frameHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/image/battle-announcement?topic=${encodeURIComponent(battle.topic)}&source=${encodeURIComponent(battle.source)}&category=${battle.category}" />
          <meta property="fc:frame:button:1" content="Join Battle (50 BATTLE)" />
          <meta property="fc:frame:button:2" content="View Debate Points" />
          <meta property="fc:frame:button:3" content="Change Topic" />
          <meta property="fc:frame:button:4" content="View Leaderboard" />
          <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/join-battle" />
          <meta property="og:title" content="NewsCast Battle: ${battle.topic}" />
          <meta property="og:description" content="Join the daily NewsCast battle and win BATTLE tokens! Source: ${battle.source}" />
        </head>
        <body>
          <h1>NewsCast Battle: ${battle.topic}</h1>
          <p>Source: ${battle.source}</p>
          <p>Category: ${battle.category}</p>
          <p>Battle ID: ${battle.id}</p>
          <p>Ends: ${battle.endTime.toLocaleString()}</p>
        </body>
      </html>
    `;
    
    return new NextResponse(frameHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error creating battle announcement frame:', error);
    return NextResponse.json({ error: 'Error creating frame' }, { status: 500 });
  }
}