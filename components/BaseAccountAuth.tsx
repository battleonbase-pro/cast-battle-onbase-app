"use client";
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount } from 'wagmi';
import { SignInWithBaseButton } from './SignInWithBaseButton';
import { baseAccountAuthService, BaseAccountUser } from '../lib/services/base-account-auth-service';
import { farcasterAuthService, FarcasterUser } from '../lib/services/farcaster-auth-service';
import styles from './BaseAccountAuth.module.css';

interface BaseAccountAuthProps {
  onAuthSuccess: (user: BaseAccountUser | FarcasterUser | null) => void;
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
  const [isMiniApp, setIsMiniApp] = useState<boolean>(false);
  const [isBaseApp, setIsBaseApp] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [farcasterUser, setFarcasterUser] = useState<FarcasterUser | null>(null);
  const { isConnected, address } = useAccount();

  // Detect Base app ecosystem
  const detectBaseApp = (): boolean => {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent.toLowerCase();
    return (
      userAgent.includes('base') ||
      userAgent.includes('coinbase') ||
      userAgent.includes('cbwallet') ||
      typeof (window as any).base !== 'undefined' ||
      typeof (window as any).baseApp !== 'undefined' ||
      typeof (window as any).ethereum?.isBase === true ||
      typeof (window as any).ethereum?.isCoinbaseWallet === true
    );
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
    (async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp(100);
        setIsMiniApp(inMiniApp);
        
        // Only detect Base app if not in Farcaster Mini App
        if (!inMiniApp) {
          const inBaseApp = detectBaseApp();
          setIsBaseApp(inBaseApp);
        }
      } catch {
        setIsMiniApp(false);
        const inBaseApp = detectBaseApp();
        setIsBaseApp(inBaseApp);
      }
    })();
  }, []);

  // Simple Farcaster Mini App ready() call
  useEffect(() => {
    const callReady = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp(100);
        if (inMiniApp) {
          console.log('🎯 Calling sdk.actions.ready() to hide splash screen');
          await sdk.actions.ready();
          console.log('✅ Farcaster Mini App ready() called successfully');
        }
      } catch (error) {
        console.log('ℹ️ Not in Farcaster Mini App or ready() failed:', error);
      }
    };

    callReady();
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    // Retro digital style: HH:MM:SS format
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const checkJoinStatus = async () => {
    try {
      const response = await fetch('/api/battle/current');
      if (response.ok) {
        const battleData = await response.json();
        if (battleData.battle) {
          // Check if user is already a participant
          const userAddress = baseAccountAuthService.getCurrentUser()?.address;
          if (userAddress && battleData.battle.participants) {
            const isParticipant = battleData.battle.participants.some(
              (p: { user?: { address?: string } }) => p.user?.address?.toLowerCase() === userAddress.toLowerCase()
            );
            console.log('🔍 Checking join status:', {
              userAddress,
              participants: battleData.battle.participants.map((p: { user?: { address?: string } }) => p.user?.address),
              isParticipant
            });
            if (isParticipant) {
              // User is already joined, log this for debugging
              console.log('✅ User already joined the current battle');
            } else {
              console.log('ℹ️ User is not yet joined to the current battle');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking join status:', error);
    }
  };

  const handleSignInWithBase = async () => {
    setError(null); // Clear any previous errors
    try {
      setIsSigningIn(true);
      // Pass prefetched nonce to strictly follow docs and avoid popups
      const result = await baseAccountAuthService.signInWithBase();
      if (result.success && result.user) {
        // Check if user is already joined after authentication
        await checkJoinStatus();
        // Always call onAuthSuccess after successful authentication
        console.log('✅ Authentication successful, calling onAuthSuccess');
        onAuthSuccess(result.user);
      } else {
        const errorMessage = result.error || 'Authentication failed';
        setError(errorMessage);
        onAuthError(errorMessage);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      onAuthError(errorMessage);
    }
    finally {
      setIsSigningIn(false);
    }
  };

  const handleFarcasterSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      console.log('🔐 Starting Farcaster sign-in...');
      const result = await farcasterAuthService.signInWithFarcaster();
      
      if (result.success && result.user) {
        console.log('✅ Farcaster sign-in successful:', result.user);
        setFarcasterUser(result.user);
        await checkJoinStatus();
        onAuthSuccess(result.user);
      } else {
        const msg = result.error || 'Farcaster authentication failed';
        setError(msg);
        onAuthError(msg);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Farcaster authentication failed';
      setError(msg);
      onAuthError(msg);
    }
    finally {
      setIsSigningIn(false);
    }
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
                  <img src={battlePreview.imageUrl} alt="Debate topic" />
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
          {isMiniApp ? (
            // Farcaster Mini App - use Quick Auth
            farcasterUser ? (
              <div className={styles.authDescription}>
                <div className={styles.userInfo}>
                  <img 
                    src={farcasterUser.pfpUrl} 
                    alt={farcasterUser.displayName}
                    className={styles.userAvatar}
                  />
                  <div>
                    <div className={styles.userName}>{farcasterUser.displayName}</div>
                    <div className={styles.userHandle}>@{farcasterUser.username}</div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.signInButton}
                onClick={handleFarcasterSignIn}
                disabled={isSigningIn}
              >
                {isSigningIn ? 'Signing in…' : 'Sign In'}
              </button>
            )
          ) : (
            // Non-Farcaster environment - use Base Account authentication
            <div>
              <SignInWithBaseButton
                colorScheme="light"
                onClick={handleSignInWithBase}
              />
              {isSigningIn && (
                <div className={styles.authDescription} style={{ marginTop: 8 }}>
                  Signing in…
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