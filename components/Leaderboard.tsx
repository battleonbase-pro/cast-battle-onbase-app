"use client";
import styles from '../app/page.module.css';

interface Player {
  address: string;
  username?: string;
  points: number;
  winCount: number;
  participationCount: number;
  recentWins: Array<{
    battleTitle: string;
    position: number;
  }>;
}

interface LeaderboardProps {
  leaderboard: Player[];
  isLoading: boolean;
}

export default function Leaderboard({ leaderboard, isLoading }: LeaderboardProps) {
  if (isLoading) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.loading}>Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.leaderboardHeader}>
        <h3 className={styles.leaderboardTitle}>🏆 Top Players</h3>
      </div>
      <div className={styles.leaderboardList}>
        {leaderboard.map((player, index) => (
          <div key={player.address} className={`${styles.leaderboardItem} ${index < 3 ? styles.topThree : ''}`}>
            <div className={styles.leaderboardRank}>
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
            </div>
            <div className={styles.leaderboardInfo}>
              <div className={styles.leaderboardAddress}>
                {player.address.slice(0, 6)}...{player.address.slice(-4)}
                {player.username && <span className={styles.leaderboardUsername}>@{player.username}</span>}
              </div>
              <div className={styles.leaderboardStats}>
                <div className={styles.leaderboardPoints}>
                  🔵 {player.points} points
                </div>
                <div className={styles.leaderboardMeta}>
                  🏆 {player.winCount} wins • 🎯 {player.participationCount} debates
                </div>
              </div>
              {player.recentWins.length > 0 && (
                <div className={styles.leaderboardRecentWins}>
                  <div className={styles.recentWinsLabel}>Recent wins:</div>
                  {player.recentWins.slice(0, 2).map((win, winIndex) => (
                    <div key={winIndex} className={styles.recentWinItem}>
                      {win.position === 1 ? '🥇' : win.position === 2 ? '🥈' : '🥉'} {win.battleTitle}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
