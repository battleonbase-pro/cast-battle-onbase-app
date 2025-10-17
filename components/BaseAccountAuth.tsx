"use client";
import { useState, useEffect } from 'react';
import { SignInWithBaseButton } from '@base-org/account-ui/react';
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
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
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
  };


  return (
    <div className={styles.authContainer}>
      <div className={styles.authContent}>
        {/* NewsCast Branding */}
        <div className={styles.brandingSection}>
          <h1 className={styles.brandTitle}>
            <span className={styles.baseText}>NewsCast</span> 
            <span className={styles.debateContainer}>
              <span className={styles.betaLabel}>Beta</span>
              <span className={styles.debateText}>Debate</span>
            </span>
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
          <SignInWithBaseButton
            colorScheme="light"
            onClick={handleSignInWithBase}
          />
          
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