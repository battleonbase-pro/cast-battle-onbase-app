import { NextRequest, NextResponse } from 'next/server';
import newsService from '@/lib/services/news-service';
import battleService from '@/lib/services/battle-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { untrustedData } = body;
    
    if (!untrustedData) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    const { fid: _fid, buttonIndex } = untrustedData;
    
    if (buttonIndex === 1) {
      // Generate New Topic button clicked
      return await handleGenerateNewTopic();
    }
    
    return NextResponse.json({ error: 'Invalid button' }, { status: 400 });
  } catch (error) {
    console.error('Error generating new topic:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}

async function handleGenerateNewTopic() {
  try {
    // Generate a new topic using the AI system
    const newTopic = await newsService.getDailyBattleTopic();
    
    // Create a new battle with the new topic
    const newBattle = await battleService.createBattle(newTopic, 24 * 60 * 60 * 1000);
    
    return createNewTopicGeneratedFrame(newBattle);
  } catch (error) {
    console.error('Error generating new topic:', error);
    return createTopicGenerationErrorFrame();
  }
}

function createNewTopicGeneratedFrame(battle: any) {
  const frameHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/image/new-topic-generated?battle=${battle.id}" />
        <meta property="fc:frame:button:1" content="Join New Battle" />
        <meta property="fc:frame:button:2" content="View Debate Points" />
        <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/join-battle" />
        <meta property="og:title" content="New Topic Generated!" />
        <meta property="og:description" content="A fresh battle topic has been generated!" />
      </head>
      <body>
        <h1>🆕 New Topic Generated!</h1>
        <p><strong>New Battle Topic:</strong></p>
        <p>${battle.topic.title}</p>
        <p><strong>Category:</strong> ${battle.topic.category}</p>
        <p><strong>Source:</strong> ${battle.topic.source}</p>
        <p>Ready to join the new battle?</p>
      </body>
    </html>
  `;
  
  return new NextResponse(frameHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}

function createTopicGenerationErrorFrame() {
  const frameHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/image/topic-error" />
        <meta property="fc:frame:button:1" content="Try Again" />
        <meta property="fc:frame:button:2" content="Back to Battle" />
        <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/frame/battle-announcement" />
        <meta property="og:title" content="Topic Generation Failed" />
        <meta property="og:description" content="Unable to generate a new topic at this time" />
      </head>
      <body>
        <h1>❌ Topic Generation Failed</h1>
        <p>Sorry, we couldn't generate a new topic right now.</p>
        <p>This might be due to:</p>
        <ul>
          <li>API rate limits</li>
          <li>Network issues</li>
          <li>Service temporarily unavailable</li>
        </ul>
        <p>Please try again later or continue with the current battle.</p>
      </body>
    </html>
  `;
  
  return new NextResponse(frameHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}
