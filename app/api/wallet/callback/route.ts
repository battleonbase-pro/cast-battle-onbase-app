import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session');
    const wallet = searchParams.get('wallet');
    const status = searchParams.get('status');
    const address = searchParams.get('address');
    
    if (!sessionId || !wallet) {
      return NextResponse.json({ error: 'Missing session or wallet parameters' }, { status: 400 });
    }
    
    // Create a simple HTML page that handles the callback
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Wallet Connection</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f8fafc;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 400px;
            }
            .success { color: #10b981; }
            .error { color: #ef4444; }
            .loading { color: #6b7280; }
            .spinner {
              border: 3px solid #f3f4f6;
              border-top: 3px solid #3b82f6;
              border-radius: 50%;
              width: 30px;
              height: 30px;
              animation: spin 1s linear infinite;
              margin: 0 auto 1rem;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div id="status">
              <div class="spinner"></div>
              <h2 class="loading">Processing wallet connection...</h2>
              <p>Please wait while we complete your wallet connection.</p>
            </div>
          </div>
          
          <script>
            // Handle the wallet callback
            const sessionId = '${sessionId}';
            const wallet = '${wallet}';
            const status = '${status || 'success'}';
            const address = '${address || ''}';
            
            // Store the session result in localStorage
            const session = {
              id: sessionId,
              wallet: wallet,
              timestamp: Date.now(),
              status: status === 'success' ? 'completed' : 'failed',
              address: address,
              returnUrl: window.location.href
            };
            
            localStorage.setItem('wallet_session_' + sessionId, JSON.stringify(session));
            
            // Update UI
            const statusDiv = document.getElementById('status');
            if (status === 'success') {
              statusDiv.innerHTML = \`
                <div style="font-size: 48px; margin-bottom: 1rem;">✅</div>
                <h2 class="success">Wallet Connected Successfully!</h2>
                <p>You can now close this window and return to the app.</p>
                <button onclick="window.close()" style="
                  background: #3b82f6;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 8px;
                  cursor: pointer;
                  margin-top: 1rem;
                ">Close Window</button>
              \`;
            } else {
              statusDiv.innerHTML = \`
                <div style="font-size: 48px; margin-bottom: 1rem;">❌</div>
                <h2 class="error">Wallet Connection Failed</h2>
                <p>Please try again or contact support if the issue persists.</p>
                <button onclick="window.close()" style="
                  background: #ef4444;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 8px;
                  cursor: pointer;
                  margin-top: 1rem;
                ">Close Window</button>
              \`;
            }
            
            // Try to close the window after a delay
            setTimeout(() => {
              if (window.close) {
                window.close();
              }
            }, 3000);
          </script>
        </body>
      </html>
    `;
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
    
  } catch (error) {
    console.error('Wallet callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
