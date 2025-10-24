"use client";
import styles from '../app/page.module.css';

interface Battle {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  sourceUrl: string;
  imageUrl: string;
  thumbnail: string;
  endTime: string;
  participants: number;
  status: string;
}

interface BattleCardProps {
  battle: Battle | null;
  timeRemaining: number | null;
  isLoading: boolean;
}

export default function BattleCard({ battle, timeRemaining, isLoading }: BattleCardProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className={styles.battleCard}>
        <div className={styles.battleHeader}>
          <h2 className={styles.topicTitle}>Loading battle...</h2>
          <p className={styles.topicDescription}>Fetching the latest debate topic...</p>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className={styles.battleCard}>
        <div className={styles.battleHeader}>
          <h2 className={styles.topicTitle}>No Active Debate</h2>
          <p className={styles.topicDescription}>
            There's currently no active debate. Check back later for new topics!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.battleCard}>
      <div className={styles.battleHeader}>
        <div className={styles.topicMeta}>
          <span className={styles.topicCategory}>{battle.category}</span>
          <a 
            href={battle.sourceUrl || battle.source} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.topicSource}
          >
            📰 {battle.source}
          </a>
          <span className={styles.participantsCount}>
            👥 {battle.participants?.length || 0} participants
          </span>
          {timeRemaining !== null && (
            <span className={styles.timer}>
              ⏰ {formatTime(timeRemaining)}
            </span>
          )}
        </div>

        {battle.imageUrl && (
          <img 
            src={battle.imageUrl} 
            alt={battle.title}
            className={styles.topicImage}
          />
        )}
        
        <h2 className={styles.topicTitle}>{battle.title}</h2>
        <p className={styles.topicDescription}>{battle.description}</p>
      </div>
    </div>
  );
}
