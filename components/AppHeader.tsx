"use client";
import { useState } from 'react';
import styles from '../app/page.module.css';

interface AppHeaderProps {
  userAddress: string;
  userPoints: number;
  onSignOut: () => void;
}

export default function AppHeader({ userAddress, userPoints, onSignOut }: AppHeaderProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <header className={styles.appHeader}>
        <div className={styles.appHeaderContent}>
          <div className={styles.appTitle}>
            <h1 className={styles.title}>
              <span className={styles.baseText}>NewsCast</span> 
              <span className={styles.debateContainer}>
                <span className={styles.betaLabel}>Beta</span>
                <span className={styles.debateText}>Debate</span>
              </span>
            </h1>
          </div>
          
          <div className={styles.userCompact}>
            <div className={styles.userInfo}>
              <span className={styles.userAddress}>
                <div className="flex items-center gap-2">
                  <span>{userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}</span>
                </div>
              </span>
              <span className={styles.userPoints}>
                {userPoints !== undefined ? `${userPoints} pts` : 'Loading...'}
              </span>
            </div>
            <button 
              onClick={() => setShowHelp(true)}
              className={styles.helpBtn}
              title="Help & Guide"
            >
              <span className={styles.helpIcon}>?</span>
            </button>
            <button 
              onClick={onSignOut}
              className={styles.signOutBtn}
              title="Sign Out"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className={styles.powerIcon}
              >
                <path 
                  d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12L16 7M21 12H9"
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Help Modal */}
      {showHelp && (
        <div className={styles.helpModal}>
          <div className={styles.helpModalContent}>
            <div className={styles.helpModalHeader}>
              <h2 className={styles.helpModalTitle}>NewCast Debate Guide</h2>
              <button 
                onClick={() => setShowHelp(false)}
                className={styles.helpModalClose}
                aria-label="Close help"
              >
                ×
              </button>
            </div>
            
            <div className={styles.helpModalBody}>
              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>🎯 How to Participate</h3>
                <ul className={styles.helpList}>
                  <li><strong>Choose Your Side:</strong> Select either "Support" or "Oppose" for the current debate topic</li>
                  <li><strong>Submit Your Argument:</strong> Write your reasoning and submit it</li>
                  <li><strong>Pay Entry Fee:</strong> Pay 1 USDC using Base Pay to participate</li>
                  <li><strong>Earn Points:</strong> Get 10 points for participation, 100 points for winning</li>
                </ul>
              </div>
              
              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>💰 Rewards System</h3>
                <ul className={styles.helpList}>
                  <li><strong>Participation:</strong> 10 points for submitting an argument</li>
                  <li><strong>Winning:</strong> 100 points for being on the winning side</li>
                  <li><strong>Leaderboard:</strong> Compete with other users for top rankings</li>
                </ul>
              </div>
              
              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>📊 Understanding the Debate</h3>
                <ul className={styles.helpList}>
                  <li><strong>Real-time Updates:</strong> See live sentiment changes as people participate</li>
                  <li><strong>AI Analysis:</strong> Get insights on debate trends and outcomes</li>
                  <li><strong>History:</strong> View past debates and their results</li>
                </ul>
              </div>
              
              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>🔧 Getting Started</h3>
                <ol className={styles.helpList}>
                  <li>Connect your Base wallet</li>
                  <li>Choose your side on the current debate</li>
                  <li>Submit your argument and pay the entry fee</li>
                  <li>Wait for the debate to end and winner announcement</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
