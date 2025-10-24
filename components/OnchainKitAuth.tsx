"use client";
import { useState, useEffect, useCallback } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import Image from 'next/image';
import styles from './OnchainKitAuth.module.css';

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

export default function OnchainKitAuth({ onAuthSuccess, onAuthError }: OnchainKitAuthProps) {
  const [battlePreview, setBattlePreview] = useState<BattlePreview | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  
  // Use OnchainKit's useMiniKit hook for Base App Mini App
  const { context, isMiniAppReady } = useMiniKit();

  // Debug MiniKit context for Base App
  useEffect(() => {
    console.log('🔍 OnchainKitAuth - MiniKit Context Debug:', {
      isMiniAppReady,
      hasContext: !!context,
      clientFid: context?.client?.clientFid,
      userFid: context?.user?.fid,
      isBaseApp: context?.client?.clientFid === 309857,
      contextKeys: context ? Object.keys(context) : []
    });
  }, [isMiniAppReady, context]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isAuthenticated && isMiniAppReady && context?.client?.clientFid === 309857 && context?.user?.fid) {
        console.log('⏰ OnchainKitAuth timeout - forcing authentication for Base App');
        // Force authentication if we're in Base App with userFid but haven't authenticated yet
        setUserAddress(context.user.fid.toString());
        setIsAuthenticated(true);

        const authUser = {
          address: context.user.fid.toString(),
          isAuthenticated: true,
          environment: 'base'
        };

        console.log('✅ OnchainKitAuth timeout authentication:', authUser);
        onAuthSuccess(authUser);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [isAuthenticated, isMiniAppReady, context, onAuthSuccess]);

  // Handle OnchainKit authentication for Base App Mini App
  const handleOnchainKitAuth = useCallback(async () => {
    try {
      setError(null);
      console.log('🔐 Starting OnchainKit authentication for Base App Mini App...');
      
      // For Base App Mini App, authentication happens automatically through MiniKit context
      // We just need to wait for the context to be ready
      if (!isMiniAppReady || !context) {
        throw new Error('MiniKit context not ready');
      }
      
      console.log('✅ OnchainKit authentication successful for Base App Mini App');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OnchainKit authentication failed';
      setError(errorMessage);
      onAuthError(errorMessage);
      console.error('❌ OnchainKit authentication error:', error);
    }
  }, [isMiniAppReady, context, onAuthError]);

  // Handle authentication success
  useEffect(() => {
    if (isMiniAppReady && context?.client?.clientFid === 309857 && context?.user?.fid) {
      console.log('✅ OnchainKit authentication detected for Base App:', { 
        fid: context.user.fid, 
        clientFid: context.client?.clientFid 
      });
      
      // For Base App Mini App, user should connect their Base web wallet for payments
      // We authenticate them with their Farcaster FID but they need to connect wallet separately
      setUserAddress(context.user.fid.toString());
      setIsAuthenticated(true);

      const authUser = {
        address: context.user.fid.toString(), // Using FID as identifier
        isAuthenticated: true,
        environment: 'base' // Indicate Base App environment
      };

      console.log('✅ OnchainKit authentication successful for Base App:', authUser);
      onAuthSuccess(authUser);
    }
  }, [isMiniAppReady, context, onAuthSuccess]);

  // Fetch current battle preview
  useEffect(() => {
    const fetchBattlePreview = async () => {
      try {
        const response = await fetch('/api/battle/current');
        if (response.ok) {
          const data = await response.json();
          setBattlePreview(data.battle);
          setTimeRemaining(data.battle.timeRemaining);
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
      <div className={styles.authCard}>
        <h2 className={styles.authTitle}>Join the Debate</h2>
        {battlePreview && (
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
              <p className={styles.timeRemaining}>
                Time Remaining: {formatTime(timeRemaining > 0 ? timeRemaining : 0)}
              </p>
            </div>
          </div>
        )}

        {error && <p className={styles.errorText}>{error}</p>}

        {!isAuthenticated ? (
          <button
            onClick={handleOnchainKitAuth}
            disabled={!isMiniAppReady}
            className={styles.signInButton}
          >
            {!isMiniAppReady ? 'Loading...' : 'Sign In with Base'}
          </button>
        ) : (
          <div className={styles.connectedInfo}>
            <p>✅ Authenticated as FID: {userAddress}</p>
            <p>You are ready to participate!</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              💡 You'll connect your Base wallet when making payments
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
