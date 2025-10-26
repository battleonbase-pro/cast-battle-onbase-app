"use client";
import styles from '../app/page.module.css';

interface BattleHistory {
  id: string;
  title: string;
  description: string;
  category: string;
  endTime: string;
  participants: number;
  winner?: string;
  insights?: string;
}

interface BattleHistoryProps {
  battleHistory: BattleHistory[];
  isLoading: boolean;
}

export default function BattleHistory({ battleHistory, isLoading }: BattleHistoryProps) {
  const formatTimeForDisplay = (utcTimestamp: string): string => {
    return new Date(utcTimestamp).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.loading}>Loading battle history...</div>
      </div>
    );
  }

  if (!battleHistory || battleHistory.length === 0) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.emptyState}>
          <p>No battle history available yet.</p>
          <p className={styles.emptyStateSubtext}>Check back after battles complete!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.historyList}>
        {battleHistory.map((battle) => (
          <div key={battle.id} className={styles.historyCard}>
            <div className={styles.historyHeader}>
              <h4 className={styles.historyTitle}>{battle.title}</h4>
              <span className={styles.historyCategory}>{battle.category}</span>
            </div>
            <div className={styles.historyStats}>
              <span className={styles.historyParticipants}>
                👥 {battle.participants} participants
              </span>
              <span className={styles.historyDate}>
                📅 {formatTimeForDisplay(battle.endTime)}
              </span>
            </div>
            {battle.winner && (
              <div className={styles.historyWinner}>
                <div className={styles.winnerLabel}>🏆 Winner:</div>
                <div className={styles.winnerInfo}>
                  {battle.winner === 'SUPPORT' ? '✅ Support' : '❌ Oppose'}
                </div>
              </div>
            )}
            {battle.insights && (
              <div className={styles.historyInsights}>
                <div className={styles.insightsLabel}>💡 AI Insights:</div>
                <div className={styles.insightsContent}>{battle.insights}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
