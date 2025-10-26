"use client";
import LikeButton from './LikeButton';
import styles from '../app/page.module.css';

interface Cast {
  id: string;
  content: string;
  side: string;
  userAddress: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
}

interface ArgumentsListProps {
  casts: Cast[];
  isLoading: boolean;
  onLikeCast: (castId: string) => void;
}

export default function ArgumentsList({ casts, isLoading, onLikeCast }: ArgumentsListProps) {
  if (isLoading) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.loading}>Loading arguments...</div>
      </div>
    );
  }

  if (!casts || casts.length === 0) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.emptyState}>
          <p>No arguments submitted yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.argumentsList}>
        {casts.map((cast) => (
          <div key={cast.id} className={styles.argumentCard}>
            <div className={styles.argumentHeader}>
              <span className={styles.argumentSide}>
                {cast.side === 'SUPPORT' ? '✅ Support' : '❌ Oppose'}
              </span>
              <span className={styles.argumentAddress}>
                {cast.userAddress.slice(0, 6)}...{cast.userAddress.slice(-4)}
              </span>
            </div>
            <div className={styles.argumentContent}>{cast.content}</div>
            <div className={styles.argumentActions}>
              <LikeButton
                castId={cast.id}
                initialLikes={cast.likes}
                isLiked={cast.isLiked}
                onLike={onLikeCast}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
