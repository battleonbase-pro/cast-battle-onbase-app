"use client";
import { useState, useEffect } from "react";
import BaseAccountAuth from '@/components/BaseAccountAuth';
import { baseAccountAuthService, BaseAccountUser } from '@/lib/services/base-account-auth-service';
import styles from "./page.module.css";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [baseAccountUser, setBaseAccountUser] = useState<BaseAccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Base Account authentication initialization
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (baseAccountAuthService.isAvailable()) {
          console.log('✅ Base Account SDK is available');
        } else {
          console.log('⚠️ Base Account SDK not available');
        }
      } catch (error) {
        console.error('❌ Base Account authentication error:', error);
      }
    };

    initializeAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await baseAccountAuthService.signOut();
      setIsAuthenticated(false);
      setBaseAccountUser(null);
      console.log('✅ Signed out successfully');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      setError(error.message);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>
                <span className={styles.baseText}>NewsCast</span> 
                <span className={styles.debateContainer}>
                  <span className={styles.betaLabel}>Beta</span>
                  <span className={styles.debateText}>Debate</span>
                </span>
              </h1>
            </div>
          </div>
          
          {baseAccountUser ? (
            <div className={styles.userCompact}>
              <div className={styles.userInfo}>
                <span className={styles.userAddress}>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">🔵</span>
                    <span>{baseAccountUser.address.slice(0, 6)}...{baseAccountUser.address.slice(-4)}</span>
                  </div>
                </span>
                <span className={styles.userPoints}>
                  🔵 0 pts
                </span>
              </div>
              <button 
                onClick={handleSignOut}
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
          ) : (
            <BaseAccountAuth
              onAuthSuccess={(user) => {
                if (user) {
                  setBaseAccountUser(user);
                  setIsAuthenticated(true);
                  console.log('✅ Base Account authentication successful');
                } else {
                  setBaseAccountUser(null);
                  setIsAuthenticated(false);
                  console.log('✅ Base Account sign out successful');
                }
              }}
              onAuthError={(error) => {
                console.error('❌ Base Account authentication error:', error);
                setError(error);
              }}
            />
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Hero Section */}
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h2 className={styles.heroTitle}>
              AI-Powered News Debates
            </h2>
            <p className={styles.heroDescription}>
              Connect with Base Account to participate in intelligent debates about trending news topics.
            </p>
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            <p>⚠️ {error}</p>
            <button onClick={() => setError(null)} className={styles.retryBtn}>Dismiss</button>
          </div>
        )}

        {baseAccountUser ? (
          <div className={styles.battleCard}>
            <div className={styles.battleHeader}>
              <h2 className={styles.topicTitle}>Welcome to Cast Battle!</h2>
              <p className={styles.topicDescription}>
                You're successfully authenticated with Base Account. The full debate platform is coming soon!
              </p>
            </div>
            
            <div className={styles.quickActions}>
              <div className={styles.joinBtn}>
                <span>🎯 Ready to debate!</span>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.battleCard}>
            <div className={styles.battleHeader}>
              <h2 className={styles.topicTitle}>Sign in to participate</h2>
              <p className={styles.topicDescription}>
                Connect your Base Account to join AI-powered news debates and earn rewards.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
