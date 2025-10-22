"use client";
import { useState, useEffect, useCallback } from 'react';
import { createBaseAccountSDK } from '@base-org/account';
import Image from 'next/image';
import styles from './BaseAuth.module.css';

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

  // Initialize Base Account SDK
  useEffect(() => {
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
  }, [onAuthError]);

  // Handle Base Account authentication using official SDK
  const handleBaseAccountConnect = useCallback(async () => {
    if (!sdk) {
      onAuthError('Base Account SDK not initialized');
      return;
    }

    try {
      setIsSigningIn(true);
      setError(null);

      console.log('🔐 Starting Base Account authentication...');

      // Get the provider from the SDK
      const provider = sdk.getProvider();
      if (!provider) {
        throw new Error('Failed to get Base Account provider');
      }

      // Generate a unique nonce
      const nonce = window.crypto.randomUUID().replace(/-/g, '');
      console.log('🔑 Generated nonce:', nonce);

      // Determine target chain (Base Sepolia for development, Base Mainnet for production)
      const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
      const chainId = isTestnet ? '0x14A34' : '0x2105'; // Base Sepolia : Base Mainnet
      
      console.log('🔗 Target chain:', { isTestnet, chainId });

      // Switch to Base chain first
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
        console.log('✅ Switched to Base chain');
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          // Chain not recognized, add it
          const chainParams = isTestnet ? {
            chainId: '0x14A34',
            chainName: 'Base Sepolia',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://sepolia.base.org'],
            blockExplorerUrls: ['https://sepolia.basescan.org'],
          } : {
            chainId: '0x2105',
            chainName: 'Base',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          };

          await provider.request({
            method: "wallet_addEthereumChain",
            params: [chainParams],
          });
          console.log('✅ Added Base chain to wallet');
        } else {
          console.log('⚠️ Chain switch failed:', switchError);
        }
      }

      // Connect using wallet_connect with SIWE capabilities
      console.log('🔐 Connecting with wallet_connect and SIWE capabilities...');
      
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

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from Base Account');
      }

      const account = accounts[0];
      const { address } = account;
      const { message, signature } = account.capabilities.signInWithEthereum;

      if (!address || !message || !signature) {
        throw new Error('Missing authentication data from Base Account');
      }

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
      
      console.log('✅ Base Account authentication successful:', user);
      onAuthSuccess(user);

    } catch (error: any) {
      const errorMessage = error.message || 'Base Account authentication failed';
      
      // Handle specific Base Account errors
      if (errorMessage.includes('method_not_supported')) {
        console.log('⚠️ wallet_connect not supported, falling back to eth_requestAccounts');
        // Fallback to eth_requestAccounts + personal_sign
        await handleFallbackAuthentication();
        return;
      }
      
      setError(errorMessage);
      onAuthError(errorMessage);
      console.error('❌ Base Account authentication error:', error);
    } finally {
      setIsSigningIn(false);
    }
  }, [sdk, onAuthSuccess, onAuthError]);

  // Fallback authentication using eth_requestAccounts + personal_sign
  const handleFallbackAuthentication = useCallback(async () => {
    if (!sdk) return;

    try {
      console.log('🔄 Using fallback authentication method...');
      
      const provider = sdk.getProvider();
      if (!provider) {
        throw new Error('Failed to get Base Account provider');
      }

      // Request accounts
      const accounts = await provider.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      const address = accounts[0];
      console.log('✅ Connected to address:', address);

      // Generate nonce and create SIWE message
      const nonce = window.crypto.randomUUID().replace(/-/g, '');
      const domain = window.location.host;
      const uri = window.location.origin;
      const currentTime = Math.floor(Date.now() / 1000);
      const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
      const chainId = isTestnet ? 84532 : 8453; // Base Sepolia : Base Mainnet

      const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Welcome to NewsCast Debate!

This request will not trigger a blockchain transaction or cost any gas fees.

Your authentication status will reset after 24 hours.

URI: ${uri}
Version: 1
Chain ID: ${chainId}
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

    } catch (error: any) {
      const errorMessage = error.message || 'Fallback authentication failed';
      setError(errorMessage);
      onAuthError(errorMessage);
      console.error('❌ Fallback authentication error:', error);
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
            // User needs to connect - use Base Account SDK
            <div>
              <button
                onClick={handleBaseAccountConnect}
                disabled={isSigningIn || !sdk}
                className={styles.signInButton}
              >
                {isSigningIn ? 'Connecting...' : 'Sign In with Base Account'}
              </button>
              {isSigningIn && (
                <div className={styles.authDescription} style={{ marginTop: 8 }}>
                  Connecting to Base Account…
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