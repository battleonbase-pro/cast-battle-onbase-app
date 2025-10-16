"use client";
import { useState, useEffect } from 'react';
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { baseAccountAuthService } from '../lib/services/base-account-auth-service';
import styles from './BaseAccountAuth.module.css';

interface BaseAccountAuthProps {
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

export default function BaseAccountAuth({ onAuthSuccess, onAuthError }: BaseAccountAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isCheckingJoinStatus, setIsCheckingJoinStatus] = useState(false);
  const [battlePreview, setBattlePreview] = useState<BattlePreview | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

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
    setIsCheckingJoinStatus(true);
    try {
      const response = await fetch('/api/battle/current');
      if (response.ok) {
        const battleData = await response.json();
        if (battleData.battle) {
          // Check if user is already a participant
          const userAddress = baseAccountAuthService.getCurrentUser()?.address;
          if (userAddress && battleData.battle.participants) {
            const isParticipant = battleData.battle.participants.some(
              (p: any) => p.user?.address?.toLowerCase() === userAddress.toLowerCase()
            );
            console.log('🔍 Checking join status:', {
              userAddress,
              participants: battleData.battle.participants.map((p: any) => p.user?.address),
              isParticipant
            });
            setIsJoined(isParticipant);
            if (isParticipant) {
              // User is already joined, automatically show debate UI
              console.log('✅ User already joined, showing debate UI');
              onAuthSuccess(baseAccountAuthService.getCurrentUser());
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking join status:', error);
    } finally {
      setIsCheckingJoinStatus(false);
    }
  };

  const handleSignInWithBase = async () => {
    setIsLoading(true);
    try {
      const result = await baseAccountAuthService.signInWithBase();
      if (result.success && result.user) {
        setIsAuthenticated(true);
        // Check if user is already joined after authentication
        await checkJoinStatus();
        // Don't call onAuthSuccess immediately - wait for join status check
      } else {
        onAuthError(result.error || 'Authentication failed');
      }
    } catch (error: any) {
      onAuthError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinBattle = async () => {
    setIsLoading(true);
    try {
      const userAddress = baseAccountAuthService.getCurrentUser()?.address;
      if (!userAddress) {
        onAuthError('User not authenticated');
        return;
      }

      const response = await fetch('/api/battle/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress })
      });

      if (response.ok) {
        console.log('✅ Successfully joined battle');
        setIsJoined(true);
        onAuthSuccess(baseAccountAuthService.getCurrentUser());
      } else {
        const errorData = await response.json();
        console.log('⚠️ Join battle response:', errorData);
        
        if (errorData.error?.includes('already joined')) {
          // User is already joined, just show the debate UI
          console.log('✅ User already joined, showing debate UI');
          setIsJoined(true);
          onAuthSuccess(baseAccountAuthService.getCurrentUser());
        } else {
          onAuthError(errorData.error || 'Failed to join battle');
        }
      }
    } catch (error: any) {
      console.error('❌ Error joining battle:', error);
      onAuthError(error.message || 'Failed to join battle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await baseAccountAuthService.signOut();
      setIsAuthenticated(false);
      onAuthSuccess(null);
    } catch (error: any) {
      onAuthError(error.message || 'Sign out failed');
    }
  };

  if (isAuthenticated && !isJoined) {
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
              Ready to join the current debate? Click below to participate!
            </p>
          </div>

          {/* Join Battle Section */}
          <div className={styles.authSection}>
            <button
              onClick={handleJoinBattle}
              disabled={isLoading || isCheckingJoinStatus}
              className={styles.signInButton}
            >
              {isLoading ? 'Joining...' : isCheckingJoinStatus ? 'Checking...' : 'Join News Debate'}
            </button>
            <button
              onClick={handleSignOut}
              className={styles.signOutButton}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}