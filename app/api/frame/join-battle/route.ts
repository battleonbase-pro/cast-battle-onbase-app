import { NextRequest, NextResponse } from 'next/server';
import battleService from '@/lib/services/battle-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { untrustedData } = body;
    
    if (!untrustedData) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    const { fid, inputText: _inputText, buttonIndex } = untrustedData;
    
    if (buttonIndex === 1) {
      // Join Battle button clicked
      return await handleJoinBattle(fid);
    } else if (buttonIndex === 2) {
      // View Debate Points button clicked
      return await createDebatePointsFrame();
    } else if (buttonIndex === 3) {
      // Change Topic button clicked
      return await createNewTopicFrame();
    } else if (buttonIndex === 4) {
      // View Leaderboard button clicked
      return await createLeaderboardFrame();
    }
    
    return NextResponse.json({ error: 'Invalid button' }, { status: 400 });
  } catch (error) {
    console.error('Error handling join battle:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}

async function handleJoinBattle(fid: string) {
  try {
    const battle = battleService.getCurrentBattle();
    
    if (!battle) {
      return NextResponse.json({ error: 'No active battle found' }, { status: 404 });
    }
    
    // Check if user already joined
    if (battle.participants.includes(fid)) {
      return createAlreadyJoinedFrame(battle);
    }
    
    // For now, just add user to participants (token charging will be implemented later)
    battle.participants.push(fid);
    
    return createJoinSuccessFrame(battle, fid);
  } catch (error) {
    console.error('Error joining battle:', error);
    return NextResponse.json({ error: 'Error joining battle' }, { status: 500 });
  }
}

function createJoinSuccessFrame(battle: any, fid: string) {
  const frameHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/image/join-success?battle=${battle.id}&fid=${fid}" />
        <meta property="fc:frame:button:1" content="Submit Cast" />
        <meta property="fc:frame:button:2" content="View Battle Status" />
        <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/submit-cast" />
        <meta property="og:title" content="Joined Battle Successfully!" />
        <meta property="og:description" content="You've joined the battle. Now submit your cast!" />
      </head>
      <body>
        <h1>🎉 Battle Joined!</h1>
        <p>Battle: ${battle.topic.title}</p>
        <p>Participants: ${battle.participants.length}</p>
        <p>Status: Active</p>
      </body>
    </html>
  `;
  
  return new NextResponse(frameHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}

function createAlreadyJoinedFrame(battle: any) {
  const frameHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/image/already-joined?battle=${battle.id}" />
        <meta property="fc:frame:button:1" content="Submit Cast" />
        <meta property="fc:frame:button:2" content="View Battle Status" />
        <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/submit-cast" />
        <meta property="og:title" content="Already Joined Battle" />
        <meta property="og:description" content="You're already in this battle!" />
      </head>
      <body>
        <h1>✅ Already Joined!</h1>
        <p>You're already participating in this battle.</p>
        <p>Battle: ${battle.topic.title}</p>
        <p>Participants: ${battle.participants.length}</p>
      </body>
    </html>
  `;
  
  return new NextResponse(frameHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}

function createDebatePointsFrame() {
  const battle = battleService.getCurrentBattle();
  
  if (!battle) {
    return NextResponse.json({ error: 'No active battle found' }, { status: 404 });
  }
  
  const frameHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/image/debate-points?battle=${battle.id}" />
        <meta property="fc:frame:button:1" content="Back to Battle" />
        <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/battle-announcement" />
        <meta property="og:title" content="Debate Points" />
        <meta property="og:description" content="View the debate points for this battle" />
      </head>
      <body>
        <h1>Debate Points</h1>
        <h2>Support:</h2>
        <ul>
          ${battle.topic.debatePoints.Support.map((point: string) => `<li>${point}</li>`).join('')}
        </ul>
        <h2>Oppose:</h2>
        <ul>
          ${battle.topic.debatePoints.Oppose.map((point: string) => `<li>${point}</li>`).join('')}
        </ul>
      </body>
    </html>
  `;
  
  return new NextResponse(frameHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}

function createNewTopicFrame() {
  const frameHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/image/new-topic" />
        <meta property="fc:frame:button:1" content="Generate New Topic" />
        <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/generate-topic" />
        <meta property="og:title" content="Generate New Topic" />
        <meta property="og:description" content="Generate a new battle topic" />
      </head>
      <body>
        <h1>🔄 New Topic</h1>
        <p>Click to generate a new battle topic!</p>
      </body>
    </html>
  `;
  
  return new NextResponse(frameHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}

function createLeaderboardFrame() {
  const frameHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/image/leaderboard" />
        <meta property="fc:frame:button:1" content="Back to Battle" />
        <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/battle-announcement" />
        <meta property="og:title" content="Leaderboard" />
        <meta property="og:description" content="View the battle leaderboard" />
      </head>
      <body>
        <h1>🏆 Leaderboard</h1>
        <p>Coming soon! Track your battle performance.</p>
      </body>
    </html>
  `;
  
  return new NextResponse(frameHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}
