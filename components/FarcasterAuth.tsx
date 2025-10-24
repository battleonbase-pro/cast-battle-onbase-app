"use client";
import { useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import Image from 'next/image';
import styles from './BaseAccountAuth.module.css';

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
  
  // Handle Farcaster authentication with simplified approach
  const handleFarcasterConnect = useCallback(async () => {
    try {
      setIsSigningIn(true);
      setError(null);

      console.log('🔐 Starting simplified Farcaster authentication...');
      
      // Check if we're in a Farcaster Mini App
      const inMiniApp = await sdk.isInMiniApp();
      if (!inMiniApp) {
        throw new Error('Not in Farcaster Mini App environment');
      }

      // Call ready to hide splash screen
      await sdk.actions.ready();

      // Get Ethereum provider
      let ethProvider;
      try {
        ethProvider = await sdk.wallet.getEthereumProvider();
      } catch (error) {
        ethProvider = sdk.wallet.ethProvider;
      }
      
      if (!ethProvider || typeof ethProvider.request !== 'function') {
        throw new Error('Failed to get Farcaster Ethereum provider');
      }

      // Request accounts from Farcaster wallet
      const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from Farcaster wallet');
      }

      const address = accounts[0];
      console.log('✅ Connected to Farcaster wallet:', address);

      // For now, skip SIWE and just use the connected address
      // This avoids the stuck transaction modal issue
      setUserAddress(address);
      setIsConnected(true);

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

  // Fetch current battle preview
  useEffect(() => {
    const fetchBattlePreview = async () => {
      try {
        const response = await fetch('/api/battle/current');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.battle) {
            setBattlePreview(data.battle);
            console.log('📊 FarcasterAuth - Battle preview loaded:', {
              title: data.battle.title,
              description: data.battle.description,
              participants: data.battle.participants,
              endTime: data.battle.endTime
            });
            
            // Calculate time remaining
            const endTime = new Date(data.battle.endTime).getTime();
            const now = Date.now();
            const remaining = Math.max(0, endTime - now);
            setTimeRemaining(remaining);
            console.log('🕐 FarcasterAuth - Time remaining calculated:', {
              endTime: data.battle.endTime,
              remaining,
              remainingSeconds: Math.floor(remaining / 1000)
            });
          } else {
            console.log('📊 FarcasterAuth - No active battle found');
            setBattlePreview(null);
            setTimeRemaining(0);
          }
        } else {
          console.log('📊 FarcasterAuth - API returned error status');
          setBattlePreview(null);
          setTimeRemaining(0);
        }
      } catch (error) {
        console.error('Failed to fetch battle preview:', error);
      }
    };

    fetchBattlePreview();
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (isConnected && userAddress) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authContent}>
          {/* Branding Section */}
          <div className={styles.brandingSection}>
            <h1 className={styles.brandTitle}>
              <span className={styles.baseText}>Base</span>
              <span className={styles.debateText}>Debate</span>
            </h1>
            <p className={styles.brandSubtitle}>AI-Powered News Debates</p>
            <p className={styles.brandDescription}>
              Join engaging debates on trending news topics. Earn points, compete with others, and win rewards.
            </p>
          </div>

          {/* Battle Preview */}
          {battlePreview && (
            <div className={styles.battlePreview}>
              <div className={styles.previewHeader}>
                <span className={styles.liveIndicator}>LIVE</span>
                <span className={styles.previewTitle}>Current Debate</span>
              </div>
              <div className={styles.previewContent}>
                <div className={styles.previewImage}>
                  <Image
                    src={battlePreview.imageUrl || '/default-debate.png'}
                    alt="Debate topic"
                    width={240}
                    height={160}
                    className={styles.previewImageElement}
                  />
                </div>
                <div className={styles.previewText}>
                  <p className={styles.previewTopic}>{battlePreview.title}</p>
                  <p className={styles.previewDescription}>{battlePreview.description}</p>
                </div>
                <div className={styles.previewStats}>
                  <div className={styles.stat}>
                    <span className={styles.statIcon}>👥</span>
                    <span className={styles.statValue}>{battlePreview.participants}</span>
                    <span className={styles.statLabel}>Participants</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statIcon}>⏰</span>
                    <span className={styles.statValue}>{formatTimeRemaining(timeRemaining)}</span>
                    <span className={styles.statLabel}>Remaining</span>
                  </div>
                </div>
                <div className={styles.previewFooter}>
                  <p className={styles.joinPrompt}>Join the debate and share your perspective!</p>
                </div>
              </div>
            </div>
          )}

          {/* Connected Info */}
          <div className={styles.connectedInfo}>
            <div className={styles.connectedIcon}>✅</div>
            <div className={styles.connectedText}>
              <div className={styles.connectedTitle}>Connected to Farcaster!</div>
              <div className={styles.connectedAddress}>FID: {userAddress}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authContent}>
        {/* Branding Section */}
        <div className={styles.brandingSection}>
          <h1 className={styles.brandTitle}>
            <span className={styles.baseText}>Base</span>
            <span className={styles.debateText}>Debate</span>
          </h1>
          <p className={styles.brandSubtitle}>AI-Powered News Debates</p>
          <p className={styles.brandDescription}>
            Join engaging debates on trending news topics. Earn points, compete with others, and win rewards.
          </p>
        </div>

        {/* Battle Preview */}
        {battlePreview && (
          <div className={styles.battlePreview}>
            <div className={styles.previewHeader}>
              <span className={styles.liveIndicator}>LIVE</span>
              <span className={styles.previewTitle}>Current Debate</span>
            </div>
            <div className={styles.previewContent}>
              <div className={styles.previewImage}>
                <Image
                  src={battlePreview.imageUrl || '/default-debate.png'}
                  alt="Debate topic"
                  width={240}
                  height={160}
                  className={styles.previewImageElement}
                />
              </div>
              <div className={styles.previewText}>
                <p className={styles.previewTopic}>{battlePreview.title}</p>
                <p className={styles.previewDescription}>{battlePreview.description}</p>
              </div>
              <div className={styles.previewStats}>
                <div className={styles.stat}>
                  <span className={styles.statIcon}>👥</span>
                  <span className={styles.statValue}>{battlePreview.participants}</span>
                  <span className={styles.statLabel}>Participants</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statIcon}>⏰</span>
                  <span className={styles.statValue}>{formatTimeRemaining(timeRemaining)}</span>
                  <span className={styles.statLabel}>Remaining</span>
                </div>
              </div>
              <div className={styles.previewFooter}>
                <p className={styles.joinPrompt}>Join the debate and share your perspective!</p>
              </div>
            </div>
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
              className={styles.dismissButton}
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Authentication Section */}
        <div className={styles.authSection}>
          <p className={styles.authDescription}>
            Connect your Farcaster wallet to participate in debates and earn rewards.
          </p>
          <button
            onClick={handleFarcasterConnect}
            disabled={isSigningIn}
            className={styles.signInButton}
          >
            {isSigningIn ? (
              <>
                <span className={styles.spinner}></span>
                Authenticating...
              </>
            ) : (
              <>
                🔗 Connect Farcaster Wallet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}