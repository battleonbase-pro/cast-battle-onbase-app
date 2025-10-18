'use client';

import { useState, useEffect } from 'react';
import styles from './LikeButton.module.css';

interface LikeButtonProps {
  castId: string;
  userAddress?: string;
  initialLikeCount?: number;
  initialUserLiked?: boolean;
  onLikeChange?: (likeCount: number, userLiked: boolean) => void;
}

export default function LikeButton({ 
  castId, 
  userAddress, 
  initialLikeCount = 0, 
  initialUserLiked = false,
  onLikeChange 
}: LikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [userLiked, setUserLiked] = useState(initialUserLiked);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial like status
  useEffect(() => {
    if (castId && userAddress) {
      fetchLikeStatus();
    }
  }, [castId, userAddress]);

  const fetchLikeStatus = async () => {
    try {
      const response = await fetch(`/api/cast/like?castId=${castId}&userAddress=${encodeURIComponent(userAddress || '')}`);
      const data = await response.json();
      
      if (data.success) {
        setLikeCount(data.likeCount);
        setUserLiked(data.userLiked);
        onLikeChange?.(data.likeCount, data.userLiked);
      }
    } catch (error) {
      console.error('Failed to fetch like status:', error);
    }
  };

  const handleLike = async () => {
    if (!userAddress) {
      setError('Please sign in to like arguments');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cast/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          castId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLikeCount(data.likeCount);
        setUserLiked(data.action === 'liked');
        onLikeChange?.(data.likeCount, data.action === 'liked');
        
        // Show success feedback
        console.log(`👍 ${data.action} cast ${castId}`);
      } else {
        setError(data.error || 'Failed to like/unlike');
      }
    } catch (error) {
      console.error('Error liking cast:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.likeButtonContainer}>
      <button
        className={`${styles.likeButton} ${userLiked ? styles.liked : ''} ${isLoading ? styles.loading : ''}`}
        onClick={handleLike}
        disabled={!userAddress || isLoading}
        title={!userAddress ? 'Sign in to like arguments' : userLiked ? 'Unlike this argument' : 'Like this argument'}
      >
        {isLoading ? (
          <span className={styles.spinner}></span>
        ) : (
          <span className={styles.thumbsIcon}>
            {userLiked ? '👍' : '👍'}
          </span>
        )}
        <span className={styles.likeCount}>
          {likeCount}
        </span>
      </button>
      
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
    </div>
  );
}
