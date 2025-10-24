"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuthenticate } from '@coinbase/onchainkit';
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
  
  // Use OnchainKit's useAuthenticate hook for Base App Mini App
  const { authenticate, isAuthenticating, isAuthenticated: onchainKitAuthenticated, address } = useAuthenticate();

  // Handle OnchainKit authentication
  const handleOnchainKitAuth = useCallback(async () => {
    try {
      setError(null);
      console.log('🔐 Starting OnchainKit authentication for Base App Mini App...');
      
      // Use OnchainKit's authenticate function
      await authenticate();
      
      console.log('✅ OnchainKit authentication successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OnchainKit authentication failed';
      setError(errorMessage);
      onAuthError(errorMessage);
      console.error('❌ OnchainKit authentication error:', error);
    }
  }, [authenticate, onAuthError]);

  // Handle authentication success
  useEffect(() => {
    if (onchainKitAuthenticated && address) {
      console.log('✅ OnchainKit authentication detected:', { address, authenticated: onchainKitAuthenticated });
      
      setUserAddress(address);
      setIsAuthenticated(true);

      const user = {
        address: address,
        isAuthenticated: true,
        environment: 'base' // Indicate Base App environment
      };

      console.log('✅ OnchainKit authentication successful:', user);
      onAuthSuccess(user);
    }
  }, [onchainKitAuthenticated, address, onAuthSuccess]);

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
            disabled={isAuthenticating}
            className={styles.signInButton}
          >
            {isAuthenticating ? 'Authenticating...' : 'Sign In with Base'}
          </button>
        ) : (
          <div className={styles.connectedInfo}>
            <p>✅ Connected: {userAddress?.substring(0, 6)}...{userAddress?.substring(userAddress.length - 4)}</p>
            <p>You are ready to participate!</p>
          </div>
        )}
      </div>
    </div>
  );
}
