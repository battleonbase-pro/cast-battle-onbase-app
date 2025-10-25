"use client";
import { useState, useEffect } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { ConnectWallet, Wallet } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import Image from 'next/image';
import styles from './BaseAccountAuth.module.css';

interface OnchainKitAuthProps {
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

export default function OnchainKitAuth({ onAuthSuccess, onAuthError: _onAuthError }: OnchainKitAuthProps) {
  const [battlePreview, setBattlePreview] = useState<BattlePreview | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [hasAuthenticated, setHasAuthenticated] = useState<boolean>(false);
  
  // Use OnchainKit's MiniKit hooks for proper authentication
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  
  // Use wagmi's useAccount to check wallet connection
  const { isConnected, address } = useAccount();

  // Signal frame readiness as per MiniKit best practices
  useEffect(() => {
    if (!isFrameReady) {
      console.log('🔧 OnchainKitAuth - Signaling frame readiness...');
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Initialize Farcaster SDK for Base App Mini App
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        console.log('🔧 OnchainKitAuth - Initializing Farcaster SDK for Base App...');
        await sdk.actions.ready();
        console.log('✅ OnchainKitAuth - Farcaster SDK ready');
      } catch (error) {
        console.error('❌ OnchainKitAuth - Failed to initialize Farcaster SDK:', error);
        // Don't throw error, just log it - SDK might not be available in all environments
      }
    };
    
    initializeSDK();
  }, []);

  // Handle authentication - automatically navigate authenticated users to debate page
  useEffect(() => {
    console.log('🔍 OnchainKitAuth - Authentication state:', { 
      context, 
      isConnected, 
      address,
      hasAuthenticated
    });

    // Prevent multiple authentication calls
    if (hasAuthenticated) {
      console.log('⚠️ OnchainKitAuth - Already authenticated, skipping');
      return;
    }

    // If wallet is connected, consider user authenticated and navigate to debate page
    if (isConnected && address) {
      console.log('✅ OnchainKitAuth - Wallet connected, proceeding to debate page:', address);
      
      const authUser = {
        address: address,
        isAuthenticated: true,
        environment: 'base'
      };

      setHasAuthenticated(true);
      onAuthSuccess(authUser);
      return;
    }
  }, [isConnected, address, hasAuthenticated, onAuthSuccess, context]);

  // Fetch current battle preview
  useEffect(() => {
    const fetchBattlePreview = async () => {
      try {
        const response = await fetch('/api/battle/current');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.battle) {
            setBattlePreview(data.battle);
            
            // Calculate time remaining in seconds from endTime
            if (data.battle.endTime) {
              const endTime = new Date(data.battle.endTime).getTime();
              const now = Date.now();
              const remainingMs = Math.max(0, endTime - now);
              const remainingSeconds = Math.floor(remainingMs / 1000);
              setTimeRemaining(remainingSeconds);
            } else {
              setTimeRemaining(0);
            }
          } else {
            console.log('📊 OnchainKitAuth - No active battle found');
            setBattlePreview(null);
            setTimeRemaining(0);
          }
        } else {
          console.log('No active battle found, attempting to create new one...');
          // Optionally trigger battle creation or show a message
        }
      } catch (err) {
        console.error('Failed to fetch battle preview:', err);
      }
    };
    fetchBattlePreview();
  }, []);

  // Countdown timer for battle
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

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
                  <span className={styles.statValue}>{formatTime(timeRemaining > 0 ? timeRemaining : 0)}</span>
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
          {!hasAuthenticated && !isConnected ? (
            <div className={styles.walletSection}>
              <p className={styles.authDescription}>
                Connect your Base wallet to participate in debates and earn rewards.
              </p>
              <Wallet>
                <ConnectWallet />
              </Wallet>
            </div>
          ) : (
            <div className={styles.connectedInfo}>
              <div className={styles.connectedIcon}>✅</div>
              <div className={styles.connectedText}>
                <div className={styles.connectedTitle}>Wallet Connected</div>
                <div className={styles.connectedAddress}>
                  {address?.substring(0, 6)}...{address?.substring(address?.length - 4)}
                </div>
                <div className={styles.connectedStatus}>
                  {hasAuthenticated ? 'Authenticated' : 'Connecting...'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}