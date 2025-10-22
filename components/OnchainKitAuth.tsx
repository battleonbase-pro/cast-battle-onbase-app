"use client";
import { useState, useEffect } from 'react';
import { ConnectWallet, useAccount, useDisconnect } from '@coinbase/onchainkit';
import { useAccount as useWagmiAccount } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import styles from './BaseAccountAuth.module.css';

interface OnchainKitAuthProps {
  onAuthSuccess: (user: any) => void;
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

export default function OnchainKitAuth({ onAuthSuccess, onAuthError }: OnchainKitAuthProps) {
  const [battlePreview, setBattlePreview] = useState<BattlePreview | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isMiniApp, setIsMiniApp] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  
  const { address, isConnected } = useWagmiAccount();
  const { disconnect } = useDisconnect();

  // Detect Farcaster Mini App environment
  useEffect(() => {
    const detectMiniApp = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsMiniApp(inMiniApp);
        
        if (inMiniApp) {
          // Call ready to hide splash screen
          await sdk.actions.ready();
        }
      } catch (error) {
        console.log('Not in Farcaster Mini App environment');
        setIsMiniApp(false);
      }
    };

    detectMiniApp();
  }, []);

  // Auto-authenticate when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      console.log('🔐 Wallet connected, auto-authenticating...');
      handleAutoAuth();
    }
  }, [isConnected, address]);

  const handleAutoAuth = async () => {
    if (!address) return;

    try {
      setIsSigningIn(true);
      setError(null);

      // Create user object
      const user = {
        address: address,
        isAuthenticated: true,
        environment: isMiniApp ? 'farcaster' : 'base'
      };

      console.log('✅ Auto-authentication successful:', user);
      onAuthSuccess(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      onAuthError(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = () => {
    disconnect();
    onAuthSuccess(null);
  };

  // Format time in HH:MM:SS format (retro digital style)
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.brandTitle}>NewsCast Debate</div>
          <div className={styles.debateText}>AI-Powered News Debates</div>
        </div>

        {/* Battle Preview */}
        {battlePreview && (
          <div className={styles.battlePreview}>
            <div className={styles.battleImage}>
              {battlePreview.imageUrl && (
                <img 
                  src={battlePreview.imageUrl} 
                  alt={battlePreview.title}
                  className={styles.topicImage}
                />
              )}
            </div>
            <div className={styles.battleInfo}>
              <h2 className={styles.battleTitle}>{battlePreview.title}</h2>
              <p className={styles.battleDescription}>{battlePreview.description}</p>
              <div className={styles.battleStats}>
                <span className={styles.participants}>
                  👥 {battlePreview.participants} participants
                </span>
                {timeRemaining > 0 && (
                  <span className={styles.timer}>
                    ⏰ {formatTime(timeRemaining)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Authentication Section */}
        <div className={styles.authSection}>
          {isConnected && address ? (
            // User is connected
            <div className={styles.connectedState}>
              <div className={styles.userInfo}>
                <div className={styles.userAddress}>
                  🔗 {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                <div className={styles.environment}>
                  {isMiniApp ? '🔗 Farcaster Mini App' : '🔵 Base App'}
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className={styles.signOutButton}
                disabled={isSigningIn}
              >
                {isSigningIn ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          ) : (
            // User needs to connect
            <div className={styles.connectSection}>
              <ConnectWallet
                render={({ onClick, status, isLoading }) => (
                  <button
                    onClick={onClick}
                    disabled={isLoading || isSigningIn}
                    className={styles.connectButton}
                  >
                    {isLoading || isSigningIn ? (
                      <div className={styles.spinner} />
                    ) : (
                      <>
                        <span>{isMiniApp ? '🔗' : '🔵'}</span>
                        <span>Sign In with {isMiniApp ? 'Farcaster' : 'Base'}</span>
                      </>
                    )}
                  </button>
                )}
              />
              
              {isSigningIn && (
                <div className={styles.authDescription} style={{ marginTop: 8 }}>
                  Signing in…
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className={styles.errorContainer}>
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          </div>
        )}

        {/* Features */}
        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🎯</span>
            <span className={styles.featureText}>AI-Powered Debates</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🏆</span>
            <span className={styles.featureText}>Compete & Win Rewards</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>⚡</span>
            <span className={styles.featureText}>Real-time Updates</span>
          </div>
        </div>
      </div>
    </div>
  );
}
