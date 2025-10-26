"use client";
import { useState, useEffect, useCallback } from 'react';
import { createBaseAccountSDK } from '@base-org/account';
import Image from 'next/image';
import styles from './BaseAccountAuth.module.css';

interface BaseAccountAuthProps {
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

export default function BaseAccountAuth({ onAuthSuccess, onAuthError }: BaseAccountAuthProps) {
  const [battlePreview, setBattlePreview] = useState<BattlePreview | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [sdk, setSdk] = useState<any>(null);

  // Initialize Base Account SDK (only once)
  useEffect(() => {
    if (sdk) return; // Don't re-initialize if already initialized
    
    try {
      const baseSDK = createBaseAccountSDK({ 
        appName: 'NewsCast Debate',
        appUrl: window.location.origin
      });
      setSdk(baseSDK);
      console.log('✅ Base Account SDK initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Base Account SDK:', error);
      onAuthError('Failed to initialize Base Account SDK');
    }
  }, [onAuthError, sdk]);

  // Handle Base Account authentication using official SDK approach
  const handleSignInWithBase = useCallback(async () => {
    if (!sdk) {
      onAuthError('Base Account SDK not initialized');
      return;
    }

    try {
      setIsSigningIn(true);
      setError(null);

      console.log('🔐 Starting Sign in with Base...');

      // Get the provider from the SDK
      const provider = sdk.getProvider();
      if (!provider) {
        throw new Error('Failed to get Base Account provider');
      }

      // 1. Get a fresh nonce (prefetch from backend as recommended)
      console.log('🔑 Fetching nonce from server...');
      const nonceResponse = await fetch('/api/auth/nonce');
      if (!nonceResponse.ok) {
        throw new Error('Failed to fetch nonce from server');
      }
      const nonceData = await nonceResponse.json();
      const nonce = nonceData.nonce;
      console.log('🔑 Received nonce from server:', nonce);

      // 2. Switch to Base Sepolia Chain (testnet mode)
      const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
      const chainId = '0x14A34'; // Always use Base Sepolia for testnet mode
      
      console.log('🔗 Switching to Base Sepolia testnet:', { isTestnet, chainId, network: 'Base Sepolia' });
      
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
        console.log('✅ Switched to Base chain');
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          // Chain not recognized, add Base Sepolia
          const chainParams = {
            chainId: '0x14A34',
            chainName: 'Base Sepolia',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://sepolia.base.org'],
            blockExplorerUrls: ['https://sepolia.basescan.org'],
          };

          await provider.request({
            method: "wallet_addEthereumChain",
            params: [chainParams],
          });
          console.log('✅ Added Base Sepolia testnet to wallet');
        } else {
          console.log('⚠️ Chain switch failed:', switchError);
        }
      }

      // 3. Connect and authenticate using wallet_connect with signInWithEthereum
      console.log('🔐 Connecting with wallet_connect and signInWithEthereum...');
      
      try {
        const { accounts } = await provider.request({
          method: 'wallet_connect',
          params: [{
            version: '1',
            capabilities: {
              signInWithEthereum: { 
                nonce, 
                chainId 
              }
            }
          }]
        });

        const { address } = accounts[0];
        const { message, signature } = accounts[0].capabilities.signInWithEthereum;

        console.log('✅ Base Account connected successfully');
        console.log('📝 Address:', address);
        console.log('📝 Message:', message);
        console.log('📝 Signature:', signature);

        // Verify signature with backend
        console.log('🔍 Verifying signature with backend...');
        
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, message, signature })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Signature verification failed');
        }

        const verificationResult = await response.json();
        console.log('✅ Backend verification successful:', verificationResult);

        // Create user object
        const user = {
          address: address,
          isAuthenticated: true,
          environment: 'base'
        };

        setUserAddress(address);
        setIsConnected(true);
        
        console.log('✅ Sign in with Base successful:', user);
        onAuthSuccess(user);

      } catch (walletConnectError: any) {
        console.log('⚠️ wallet_connect not supported, falling back to eth_requestAccounts + personal_sign');
        
        // Fallback to eth_requestAccounts + personal_sign
        const accounts = await provider.request({
          method: 'eth_requestAccounts'
        });

        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts returned');
        }

        const address = accounts[0];
        console.log('✅ Connected to address:', address);

        const domain = window.location.host;
        const uri = window.location.origin;
        const currentTime = Math.floor(Date.now() / 1000);
        const chainIdDecimal = 84532; // Base Sepolia testnet

        const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Welcome to NewsCast Debate!

This request will not trigger a blockchain transaction or cost any gas fees.

Your authentication status will reset after 24 hours.

URI: ${uri}
Version: 1
Chain ID: ${chainIdDecimal}
Nonce: ${nonce}
Issued At: ${new Date(currentTime * 1000).toISOString()}`;

        console.log('📝 Generated SIWE message:', message);

        // Sign the message
        const signature = await provider.request({
          method: 'personal_sign',
          params: [message, address]
        });

        console.log('✅ personal_sign successful');
        console.log('📝 Generated signature:', signature);

        // Verify with backend
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, message, signature })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Signature verification failed');
        }

        const verificationResult = await response.json();
        console.log('✅ Backend verification successful:', verificationResult);

        // Create user object
        const user = {
          address: address,
          isAuthenticated: true,
          environment: 'base'
        };

        setUserAddress(address);
        setIsConnected(true);
        
        console.log('✅ Fallback authentication successful:', user);
        onAuthSuccess(user);
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Sign in with Base failed';
      setError(errorMessage);
      onAuthError(errorMessage);
      console.error('❌ Sign in with Base error:', error);
    } finally {
      setIsSigningIn(false);
    }
  }, [sdk, onAuthSuccess, onAuthError]);



  const handleSignOut = () => {
    setIsConnected(false);
    setUserAddress(null);
    onAuthSuccess(null);
  };

  // Fetch battle preview for marketing
  const fetchBattlePreview = async () => {
    try {
      const response = await fetch('/api/battle/current');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.battle) {
          const battle = data.battle;
          const endTime = new Date(battle.endTime).getTime();
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
          
          setBattlePreview({
            id: battle.id,
            title: battle.title,
            description: battle.description,
            imageUrl: battle.imageUrl,
            participants: Array.isArray(battle.participants) ? battle.participants.length : (battle.participants || 0),
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
          <h2 className={styles.brandSubtitle}>AI-Powered News Debates</h2>
          <p className={styles.brandDescription}>
            Connect with your Base Account to participate in intelligent debates about trending news topics.
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
                    className={styles.previewImageElement}
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
          {isConnected && userAddress ? (
            // User is connected - show user info
            <div className={styles.authDescription}>
              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  🔗 {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                </div>
                <div className={styles.userHandle}>
                  Base Account Connected
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className={styles.signInButton}
                style={{ marginTop: '8px', backgroundColor: '#dc2626' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            // Sign in with Base - standard approach
            <div>
              <button
                onClick={handleSignInWithBase}
                disabled={isSigningIn || !sdk}
                className={styles.signInButton}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000',
                  minWidth: '180px',
                  height: '44px'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#0000FF',
                  borderRadius: '2px',
                  flexShrink: 0
                }} />
                <span>{isSigningIn ? 'Signing in...' : 'Sign in with Base'}</span>
              </button>
              {isSigningIn && (
                <div className={styles.authDescription} style={{ marginTop: 8 }}>
                  Please approve the connection and sign the message in your Base Account wallet…
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