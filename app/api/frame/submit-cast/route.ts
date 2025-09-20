import { NextRequest, NextResponse } from 'next/server';
import battleService from '@/lib/services/battle-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { untrustedData } = body;
    
    if (!untrustedData) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    const { fid, inputText, buttonIndex } = untrustedData;
    
    if (buttonIndex === 1) {
      // Submit Cast button clicked
      return await handleCastSubmission(fid, inputText);
    } else if (buttonIndex === 2) {
      // View Battle Status button clicked
      return await createBattleStatusFrame();
    }
    
    return NextResponse.json({ error: 'Invalid button' }, { status: 400 });
  } catch (error) {
    console.error('Error handling cast submission:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}

async function handleCastSubmission(fid: string, castText: string) {
  try {
    const battle = battleService.getCurrentBattle();
    
    if (!battle) {
      return NextResponse.json({ error: 'No active battle found' }, { status: 404 });
    }
    
    // Check if user is a participant
    if (!battle.participants.includes(fid)) {
      return createNotParticipantFrame(battle);
    }
    
    // Validate cast text
    if (!castText || castText.trim().length < 10) {
      return createInvalidCastFrame();
    }
    
    // Create cast submission
    const castSubmission = {
      id: `cast_${Date.now()}_${fid}`,
      userId: fid,
      text: castText.trim(),
      timestamp: new Date(),
      battleId: battle.id,
    };
    
    // Submit cast to battle service
    battleService.submitCast(battle.id, castSubmission);
    
    return createCastSubmittedFrame(castSubmission);
  } catch (error) {
    console.error('Error submitting cast:', error);
    return NextResponse.json({ error: 'Error submitting cast' }, { status: 500 });
  }
}

function createCastSubmittedFrame(castSubmission: any) {
  const frameHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/image/cast-submitted?cast=${castSubmission.id}" />
        <meta property="fc:frame:button:1" content="View Battle Status" />
        <meta property="fc:frame:button:2" content="Submit Another Cast" />
        <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/submit-cast" />
        <meta property="og:title" content="Cast Submitted!" />
        <meta property="og:description" content="Your cast has been submitted successfully!" />
      </head>
      <body>
        <h1>✅ Cast Submitted!</h1>
        <p><strong>Your Cast:</strong></p>
        <p>"${castSubmission.text}"</p>
        <p><strong>Cast ID:</strong> ${castSubmission.id}</p>
        <p><strong>Submitted:</strong> ${castSubmission.timestamp.toLocaleString()}</p>
        <p>Good luck in the battle! 🎯</p>
      </body>
    </html>
  `;
  
  return new NextResponse(frameHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}

function createNotParticipantFrame(battle: any) {
  const frameHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/image/not-participant?battle=${battle.id}" />
        <meta property="fc:frame:button:1" content="Join Battle First" />
        <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/join-battle" />
        <meta property="og:title" content="Join Battle First" />
        <meta property="og:description" content="You need to join the battle before submitting a cast" />
      </head>
      <body>
        <h1>⚠️ Join Battle First</h1>
        <p>You need to join the battle before you can submit a cast.</p>
        <p><strong>Battle:</strong> ${battle.topic.title}</p>
        <p>Click "Join Battle First" to participate!</p>
      </body>
    </html>
  `;
  
  return new NextResponse(frameHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}

function createInvalidCastFrame() {
  const frameHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/image/invalid-cast" />
        <meta property="fc:frame:button:1" content="Try Again" />
        <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/submit-cast" />
        <meta property="og:title" content="Invalid Cast" />
        <meta property="og:description" content="Your cast is too short. Please provide a more detailed response." />
      </head>
      <body>
        <h1>❌ Invalid Cast</h1>
        <p>Your cast is too short. Please provide a more detailed response.</p>
        <p><strong>Minimum length:</strong> 10 characters</p>
        <p>Try again with a more substantial argument!</p>
      </body>
    </html>
  `;
  
  return new NextResponse(frameHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}

function createBattleStatusFrame() {
  const battle = battleService.getCurrentBattle();
  
  if (!battle) {
    return NextResponse.json({ error: 'No active battle found' }, { status: 404 });
  }
  
  const frameHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/image/battle-status?battle=${battle.id}" />
        <meta property="fc:frame:button:1" content="Back to Battle" />
        <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/battle-announcement" />
        <meta property="og:title" content="Battle Status" />
        <meta property="og:description" content="Current battle status and statistics" />
      </head>
      <body>
        <h1>📊 Battle Status</h1>
        <p><strong>Topic:</strong> ${battle.topic.title}</p>
        <p><strong>Participants:</strong> ${battle.participants.length}</p>
        <p><strong>Casts Submitted:</strong> ${battle.casts.length}</p>
        <p><strong>Status:</strong> ${battle.status}</p>
        <p><strong>Ends:</strong> ${battle.endTime.toLocaleString()}</p>
        <p><strong>Winner:</strong> ${battle.winner || 'TBD'}</p>
      </body>
    </html>
  `;
  
  return new NextResponse(frameHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}
