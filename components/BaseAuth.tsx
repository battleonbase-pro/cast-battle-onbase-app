"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage, useDisconnect, useConnect } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import Image from 'next/image';
import styles from './BaseAuth.module.css';

interface BaseAuthProps {
  onAuthSuccess: (user: { address: string; isAuthenticated: boolean; environment: string } | null) => void;
  onAuthError: (error: string) => void;
}

interface BattlePreview {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  participants: number;
  timeRemaining: number;
  status: string;
}

export default function BaseAuth({ onAuthSuccess, onAuthError }: BaseAuthProps) {
  const [battlePreview, setBattlePreview] = useState<BattlePreview | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [hasAuthenticated, setHasAuthenticated] = useState<boolean>(false);
  
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();

  // Perform SIWE authentication
  const performAuthentication = useCallback(async (connectedAddress: string) => {
    if (!connectedAddress) return;

    try {
      setIsSigningIn(true);
      setError(null);

      console.log('🔐 Performing SIWE authentication for:', connectedAddress);
      console.log('🔐 Connection state:', { isConnected, address, connectedAddress });

      // Check if we're actually connected before proceeding
      if (!isConnected || !address) {
        console.log('⚠️ Not connected, skipping authentication');
        setIsSigningIn(false);
        return;
      }

      // Additional check: verify the address matches
      if (connectedAddress.toLowerCase() !== address.toLowerCase()) {
        console.log('⚠️ Address mismatch, skipping authentication');
        setIsSigningIn(false);
        return;
      }

      // 1. Fetch nonce from your backend
      const nonceResponse = await fetch('/api/auth/nonce');
      if (!nonceResponse.ok) {
        throw new Error('Failed to fetch nonce');
      }
      const { nonce } = await nonceResponse.json();

      // 2. Create proper SIWE message format
      const domain = window.location.host;
      const uri = window.location.origin;
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Use the same chain detection logic as the verification endpoint
      const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
      const chainId = isTestnet ? 84532 : 8453; // Base Sepolia : Base Mainnet
      
      console.log('🔗 Chain configuration:', { isTestnet, chainId, nodeEnv: process.env.NODE_ENV, network: process.env.NEXT_PUBLIC_NETWORK });
      
      const message = `${domain} wants you to sign in with your Ethereum account:
${connectedAddress}

Welcome to NewsCast Debate!

This request will not trigger a blockchain transaction or cost any gas fees.

Your authentication status will reset after 24 hours.

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date(currentTime * 1000).toISOString()}`;
      
      // Final check before signing
      if (!isConnected || !address) {
        console.log('⚠️ Connection lost before signing, aborting');
        setIsSigningIn(false);
        return;
      }
      
      console.log('📝 Generated SIWE message:', message);
      const signature = await signMessageAsync({ message });
      console.log('📝 Generated signature:', signature);

      // 3. Verify signature with your backend
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: connectedAddress, signature, message }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'Signature verification failed');
      }

      const user = {
        address: connectedAddress,
        isAuthenticated: true,
        environment: 'base'
      };

      console.log('✅ Base authentication successful:', user);
      console.log('🔐 Calling onAuthSuccess with user:', user);
      setHasAuthenticated(true);
      onAuthSuccess(user);
      console.log('✅ onAuthSuccess called successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      
      // Don't show error or disconnect if it's just a connection issue
      if (errorMessage.includes('Connector not connected') || errorMessage.includes('ConnectorNotConnectedError')) {
        console.log('⚠️ Connector not connected, silently skipping authentication');
        setIsSigningIn(false);
        return;
      }
      
      setError(errorMessage);
      onAuthError(errorMessage);
      console.error('❌ Base authentication error:', error);
      disconnect(); // Disconnect on auth error
    } finally {
      setIsSigningIn(false);
    }
  }, [signMessageAsync, onAuthSuccess, onAuthError, disconnect, isConnected, address]);

  // Handle wallet connection
  const handleWalletConnect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      console.log('🔐 Starting wallet connection...');
      
      // Determine target chain
      const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
      const targetChainId = isTestnet ? 84532 : 8453; // Base Sepolia : Base Mainnet
      
      console.log('🔗 Target chain:', { isTestnet, chainId: targetChainId });
      
      // Try to connect with Coinbase Wallet
      await connect({ connector: coinbaseWallet({ appName: 'NewsCast Debate' }) });
      
      console.log('🔐 Wallet connection initiated, waiting for auto-authentication...');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Wallet connection failed';
      setError(errorMessage);
      onAuthError(errorMessage);
      console.error('❌ Wallet connection error:', error);
      setIsConnecting(false);
    }
  }, [connect, onAuthError]);


  // Reset authentication state when disconnected
  useEffect(() => {
    if (!isConnected) {
      setHasAuthenticated(false);
      setIsConnecting(false);
      setIsSigningIn(false);
    }
  }, [isConnected]);

  // Auto-authenticate when wallet is connected
  useEffect(() => {
    // Only proceed if we have a valid connection and haven't authenticated yet
    if (isConnected && address && !isSigningIn && !hasAuthenticated) {
      console.log('🔐 Base wallet connected, auto-authenticating...');
      console.log('🔐 Connection details:', { isConnected, address, isSigningIn, hasAuthenticated });
      setIsConnecting(false); // Connection is complete
      
      // Add a small delay to ensure wagmi state is stable
      const timeoutId = setTimeout(async () => {
        // Double-check conditions before proceeding
        if (isConnected && address && !isSigningIn && !hasAuthenticated) {
          // Ensure we're on the correct chain before authentication
          const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
          
          try {
            // Switch to Base Sepolia if needed
            if (isTestnet) {
              console.log('🔗 Ensuring wallet is on Base Sepolia...');
              await window.ethereum?.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x14A34' }], // Base Sepolia chain ID in hex
              });
            }
          } catch (switchError) {
            console.log('⚠️ Chain switch failed or already on correct chain:', switchError);
            // Continue with authentication even if chain switch fails
          }
          
          performAuthentication(address);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else {
      console.log('🔐 Skipping auto-authentication:', { isConnected, address, isSigningIn, hasAuthenticated });
    }
  }, [isConnected, address, performAuthentication, isSigningIn, hasAuthenticated]);


  // Fetch battle preview for marketing
  const fetchBattlePreview = async () => {
    try {
      const response = await fetch('/api/battle/current');
      if (response.ok) {
        const data = await response.json();
        if (data.battle) {
          const battle = data.battle;
          const endTime = new Date(battle.endTime).getTime();
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
          
          setBattlePreview({
            id: battle.id,
            title: battle.title,
            description: battle.description,
            imageUrl: battle.imageUrl,
            participants: battle.participants?.length || 0,
            timeRemaining: remaining,
            status: battle.status
          });
          setTimeRemaining(remaining);
        }
      }
    } catch (error) {
      console.error('Error fetching battle preview:', error);
    }
  };

  // Update timer every second
  useEffect(() => {
    if (battlePreview && battlePreview.status === 'ACTIVE') {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 1);
          if (newTime === 0) {
            // Battle ended, refresh preview
            fetchBattlePreview();
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [battlePreview]);

  // Fetch battle preview on component mount
  useEffect(() => {
    fetchBattlePreview();
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    // Retro digital style: HH:MM:SS format
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authContent}>
        {/* NewsCast Branding */}
        <div className={styles.brandingSection}>
          <h1 className={styles.brandTitle}>
            <span className={styles.baseText}>NewsCast</span> 
            <span className={styles.debateText}>Debate</span>
          </h1>
          <h2 className={styles.brandSubtitle}>
            AI-Powered News Debates
          </h2>
          <p className={styles.brandDescription}>
            Connect with Base Account to participate in intelligent debates about trending news topics.
          </p>
        </div>

        {/* Live Battle Preview */}
        {battlePreview && (
          <div className={styles.battlePreview}>
            <div className={styles.previewHeader}>
              <span className={styles.liveIndicator}>🔴 LIVE</span>
              <span className={styles.previewTitle}>Current Debate</span>
            </div>
            
            <div className={styles.previewContent}>
              {battlePreview.imageUrl && (
                <div className={styles.previewImage}>
                  <Image 
                    src={battlePreview.imageUrl} 
                    alt="Debate topic" 
                    width={300}
                    height={200}
                  />
                </div>
              )}
              
              <div className={styles.previewText}>
                <h3 className={styles.previewTopic}>{battlePreview.title}</h3>
                <p className={styles.previewDescription}>{battlePreview.description}</p>
              </div>
            </div>
            
            <div className={styles.previewStats}>
              <div className={styles.stat}>
                <span className={styles.statIcon}>👥</span>
                <span className={styles.statValue}>{battlePreview.participants}</span>
                <span className={styles.statLabel}>participants</span>
              </div>
              
              <div className={styles.stat}>
                <span className={styles.statIcon}>⏰</span>
                <span className={styles.statValue}>{formatTime(timeRemaining)}</span>
                <span className={styles.statLabel}>remaining</span>
              </div>
            </div>
            
            <div className={styles.previewFooter}>
              <span className={styles.joinPrompt}>Join the debate and share your perspective!</span>
            </div>
          </div>
        )}

            {/* Authentication Section */}
            <div className={styles.authSection}>
              {isConnected && address ? (
                // User is connected - show user info
                <div className={styles.authDescription}>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>
                      🔗 {address.slice(0, 6)}...{address.slice(-4)}
                    </div>
                    <div className={styles.userHandle}>
                      Base Account Connected
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      disconnect();
                      onAuthSuccess(null);
                    }}
                    className={styles.signInButton}
                    style={{ marginTop: '8px', backgroundColor: '#dc2626' }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                // User needs to connect - use official Base SignInWithBaseButton
                <div>
                  <SignInWithBaseButton 
                    align="center"
                    variant="solid"
                    colorScheme="light"
                    onClick={isConnecting || isSigningIn ? undefined : handleWalletConnect}
                  />
                  {(isConnecting || isSigningIn) && (
                    <div className={styles.authDescription} style={{ marginTop: 8 }}>
                      {isConnecting ? 'Connecting to Base Account...' : 'Signing in with Ethereum...'}
                    </div>
                  )}
                </div>
              )}
              
              {/* Error Display */}
              {error && (
                <div className={styles.errorContainer}>
                  <div className={styles.errorMessage}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <span className={styles.errorText}>{error}</span>
                  </div>
                  <button 
                    onClick={() => setError(null)} 
                    className={styles.dismissButton}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
      </div>
    </div>
  );
}
