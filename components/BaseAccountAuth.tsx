"use client";
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount } from 'wagmi';
import { SignInWithBaseButton } from './SignInWithBaseButton';
import { baseAccountAuthService, BaseAccountUser } from '../lib/services/base-account-auth-service';
import styles from './BaseAccountAuth.module.css';

interface BaseAccountAuthProps {
  onAuthSuccess: (user: BaseAccountUser | null) => void;
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
  const [prefetchedNonce, setPrefetchedNonce] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isInterfaceReady, setIsInterfaceReady] = useState<boolean>(false);
  const { isConnected, address } = useAccount();

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
      } catch {
        setIsMiniApp(false);
      }
      try {
        const nonceResponse = await fetch('/api/auth/nonce');
        if (nonceResponse.ok) {
          const { nonce } = await nonceResponse.json();
          setPrefetchedNonce(nonce);
        }
      } catch {}
    })();
  }, []);

  // Call ready() when interface is loaded
  useEffect(() => {
    const callReady = async () => {
      if (isMiniApp && isInterfaceReady) {
        try {
          console.log('🎯 Interface ready - calling sdk.actions.ready() to hide splash screen');
          await sdk.actions.ready();
          console.log('✅ Farcaster Mini App ready() called successfully');
        } catch (error) {
          console.error('❌ Failed to call sdk.actions.ready():', error);
        }
      }
    };

    callReady();
  }, [isMiniApp, isInterfaceReady]);

  // Auto-authenticate connected users in Base app
  useEffect(() => {
    const autoAuthenticate = async () => {
      if (isMiniApp && isConnected && address && !isSigningIn) {
        console.log('🔄 Auto-authenticating connected user in Base app:', address);
        try {
          setIsSigningIn(true);
          const result = await baseAccountAuthService.signInWithBase(prefetchedNonce || undefined);
          if (result.success && result.user) {
            await checkJoinStatus();
            console.log('✅ Auto-authentication successful, calling onAuthSuccess');
            onAuthSuccess(result.user);
          } else {
            console.log('⚠️ Auto-authentication failed:', result.error);
            // Don't show error for auto-auth failures, just log it
          }
        } catch (error) {
          console.log('⚠️ Auto-authentication error:', error);
          // Don't show error for auto-auth failures, just log it
        } finally {
          setIsSigningIn(false);
        }
      }
    };

    autoAuthenticate();
  }, [isMiniApp, isConnected, address, prefetchedNonce, isSigningIn, onAuthSuccess]);

  // Set interface ready after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInterfaceReady(true);
      console.log('🎯 Interface marked as ready');
    }, 100); // Small delay to ensure everything is rendered

    return () => clearTimeout(timer);
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
      const result = await baseAccountAuthService.signInWithBase(prefetchedNonce || undefined);
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

  const handleMiniAppConnect = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      const result = await baseAccountAuthService.signInWithBase(prefetchedNonce || undefined);
      if (result.success && result.user) {
        await checkJoinStatus();
        onAuthSuccess(result.user);
      } else {
        const msg = result.error || 'Authentication failed';
        setError(msg);
        onAuthError(msg);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Authentication failed';
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
            !isConnected ? (
              <button
                type="button"
                className={styles.signInButton}
                onClick={handleMiniAppConnect}
                disabled={isSigningIn}
              >
                {isSigningIn ? 'Connecting…' : 'Connect Wallet'}
              </button>
            ) : (
              <div className={styles.authDescription}>
                {isSigningIn ? 'Signing in…' : `You're connected${address ? `: ${address.slice(0, 6)}…${address.slice(-4)}` : ''}}
              </div>
            )
          ) : (
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