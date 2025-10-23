"use client";
import { useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import Image from 'next/image';
import styles from './FarcasterAuth.module.css';

interface FarcasterAuthProps {
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

export default function FarcasterAuth({ onAuthSuccess, onAuthError }: FarcasterAuthProps) {
  const [battlePreview, setBattlePreview] = useState<BattlePreview | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  // Handle Farcaster native wallet connection
  const handleFarcasterConnect = useCallback(async () => {
    try {
      setIsSigningIn(true);
      setError(null);

      // Check if we're in a Farcaster Mini App
      const inMiniApp = await sdk.isInMiniApp();
      if (!inMiniApp) {
        throw new Error('Not in Farcaster Mini App environment');
      }

      // Call ready to hide splash screen
      await sdk.actions.ready();

      // Connect to Farcaster's native Ethereum wallet
      console.log('🔍 SDK wallet object:', sdk.wallet);
      console.log('🔍 Available wallet methods:', Object.keys(sdk.wallet || {}));
      
      let ethProvider;
      try {
        // Try the primary method
        ethProvider = await sdk.wallet.getEthereumProvider();
        console.log('🔍 Ethereum provider (getEthereumProvider):', ethProvider);
      } catch (error) {
        console.log('⚠️ getEthereumProvider failed, trying ethProvider property:', error);
        try {
          // Try accessing ethProvider as a property (not a function)
          ethProvider = sdk.wallet.ethProvider;
          console.log('🔍 Ethereum provider (ethProvider property):', ethProvider);
        } catch (fallbackError) {
          console.log('❌ Both methods failed:', fallbackError);
          throw new Error('Failed to get Farcaster Ethereum provider from both methods');
        }
      }
      
      console.log('🔍 Provider type:', typeof ethProvider);
      
      if (!ethProvider) {
        throw new Error('Failed to get Farcaster Ethereum provider');
      }
      
      if (typeof ethProvider.request !== 'function') {
        throw new Error('Ethereum provider does not have request method');
      }

      // Request accounts from Farcaster wallet
      const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from Farcaster wallet');
      }

      const address = accounts[0];
      setUserAddress(address);
      setIsConnected(true);

      // Create user object
      const user = {
        address: address,
        isAuthenticated: true,
        environment: 'farcaster'
      };

      console.log('✅ Farcaster authentication successful:', user);
      onAuthSuccess(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Farcaster authentication failed';
      setError(errorMessage);
      onAuthError(errorMessage);
      console.error('❌ Farcaster authentication error:', error);
    } finally {
      setIsSigningIn(false);
    }
  }, [onAuthSuccess, onAuthError]);

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
            Connect with your Farcaster wallet to participate in intelligent debates about trending news topics.
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
                  Farcaster Wallet Connected
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
            // User needs to connect - use Farcaster native connection
            <div>
              <button
                onClick={handleFarcasterConnect}
                disabled={isSigningIn}
                className={styles.signInButton}
              >
                {isSigningIn ? 'Connecting...' : 'Connect Wallet'}
              </button>
              {isSigningIn && (
                <div className={styles.authDescription} style={{ marginTop: 8 }}>
                  Connecting to Farcaster wallet…
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
