"use client";
import { useState, useEffect } from "react";
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { createBaseAccountSDK } from '@base-org/account';
import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import styles from "./page.module.css";

interface DebateTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  debatePoints: {
    Support: string[];
    Oppose: string[];
  };
}

export default function Home() {
  const [topic, setTopic] = useState<DebateTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [battleJoined, setBattleJoined] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sdk, setSdk] = useState<any>(null);
  const [balance, setBalance] = useState<string>('0');
  const [battleStatus, setBattleStatus] = useState<'active' | 'completed' | null>(null);
  const [battleHistory, setBattleHistory] = useState<any[]>([]);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing app...');
      // Initialize the application and battle manager
      await fetch('/api/init', { method: 'POST' });
      console.log('App initialized');
      
      // Then fetch the current battle and history
      await Promise.all([
        fetchCurrentBattle(),
        fetchBattleHistory()
      ]);
      console.log('Battle data fetched');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setError('Failed to initialize application');
    }
  };

  const fetchBattleHistory = async () => {
    try {
      const response = await fetch('/api/battle/history');
      const data = await response.json();
      
      if (data.success) {
        setBattleHistory(data.battles);
      }
    } catch (error) {
      console.error('Failed to fetch battle history:', error);
    }
  };

  useEffect(() => {
    // Initialize Base Account SDK on client side only
    if (typeof window !== 'undefined') {
      try {
        console.log('Initializing Base Account SDK...');
        const baseSDK = createBaseAccountSDK({
          appName: 'Cast Battle OnBase',
          appLogoUrl: 'https://base.org/favicon.ico',
          appChainIds: [base.id],
        });
        setSdk(baseSDK);
        console.log('Base Account SDK initialized successfully');
        
        // Check for existing authentication
        const savedUser = localStorage.getItem('cast-battle-user');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          // Fetch balance for existing user
          fetchBalance(userData.address);
        }
      } catch (error) {
        console.error('Failed to initialize Base Account SDK:', error);
        setError('Failed to initialize wallet connection');
      }
    }
  }, []);

  const fetchBalance = async (address: string) => {
    try {
      // Mock balance for now - in real app, fetch from contract
      const mockBalance = '1,250';
      setBalance(mockBalance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance('0');
    }
  };

  const fetchCurrentBattle = async () => {
    try {
      console.log('Fetching current battle...');
      setLoading(true);
      
      // Initialize battle manager first
      await fetch('/api/battle/manage', { method: 'POST' });
      console.log('Battle manager initialized');
      
      // Get current battle
      const response = await fetch('/api/battle/current');
      const data = await response.json();
      console.log('Battle response:', data);
      
      if (data.success && data.battle) {
        setTopic(data.battle.topic);
        setBattleStatus(data.battle.status);
        
        // Check if user already joined this battle
        if (user && data.battle.participants.includes(user.address)) {
          setBattleJoined(true);
        }
      } else {
        setError(data.error || 'No active battle available');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!sdk) {
      setError('Wallet connection not ready. Please try again.');
      return;
    }

    try {
      // Get the provider and create wallet client
      const provider = sdk.getProvider();
      
      // First, get the account address
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      const accountAddress = accounts[0];
      
      // Create wallet client with the account
      const client = createWalletClient({
        chain: base,
        transport: custom(provider),
        account: accountAddress
      });

      // Sign authentication message
      const message = `Sign in to Cast Battle OnBase at ${Date.now()}`;
      const signature = await client.signMessage({ 
        account: accountAddress,
        message,
      });

      // Set user data
      const userData = {
        address: accountAddress,
        signature: signature,
        timestamp: Date.now()
      };
      
      setUser(userData);
      
      // Save to localStorage for persistence
      localStorage.setItem('cast-battle-user', JSON.stringify(userData));
      
      // Fetch balance
      await fetchBalance(accountAddress);
      
      // Refetch current battle to check if user already joined
      await fetchCurrentBattle();

      console.log('User signed in successfully:', accountAddress);
    } catch (error) {
      console.error('Sign in failed:', error);
      setError(error.message || 'Sign in failed');
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setBalance('0');
    localStorage.removeItem('cast-battle-user');
  };

  const joinBattle = async () => {
    if (!topic || !user) return;
    
    try {
      const response = await fetch('/api/battle/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: user.address })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBattleJoined(true);
        console.log('User joined battle for topic:', topic.title);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.headerWrapper}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Cast Battle</h1>
            <p className={styles.subtitle}>AI-powered daily debates with $BATTLE token rewards</p>
          </div>
          {user ? (
            <div className={styles.userSection}>
              <div className={styles.balanceDisplay}>
                <span className={styles.balanceLabel}>$BATTLE</span>
                <span className={styles.balanceAmount}>{balance}</span>
              </div>
              <div className={styles.userProfile}>
                <div className={styles.userAddress}>
                  {user.address.slice(0, 6)}...{user.address.slice(-4)}
                </div>
                <button 
                  onClick={handleSignOut}
                  className={styles.signOutBtn}
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <SignInWithBaseButton 
              align="center"
              variant="solid"
              colorScheme="light"
              size="medium"
              disabled={!sdk}
              onSignIn={handleSignIn}
            />
          )}
        </div>
      </header>

      <div className={styles.content}>
        {/* Battle Topic */}
        <div className={styles.battleSection}>
          <h2 className={styles.sectionTitle}>Today's Battle Topic</h2>
          {battleStatus && (
            <div className={styles.battleStatusIndicator}>
              <span className={`${styles.statusBadge} ${styles[battleStatus]}`}>
                {battleStatus.toUpperCase()}
              </span>
            </div>
          )}
          
          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>AI is curating today's battle topic...</p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              ⚠️ {error}
              <button onClick={fetchCurrentBattle} className={styles.retryBtn}>Retry</button>
            </div>
          )}

          {topic && !loading && !error && (
            <div className={styles.topicCard}>
              <div className={styles.topicHeader}>
                <h3>{topic.title}</h3>
                <div className={styles.topicMeta}>
                  <span className={styles.category}>{topic.category}</span>
                  <span className={styles.source}>Source: {topic.source}</span>
                </div>
              </div>

              <div className={styles.topicDescription}>
                <p>{topic.description}</p>
              </div>

              <div className={styles.debatePoints}>
                <div className={styles.debateSide}>
                  <h4>Support:</h4>
                  <ul>
                    {topic.debatePoints.Support.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.debateSide}>
                  <h4>Oppose:</h4>
                  <ul>
                    {topic.debatePoints.Oppose.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={styles.topicActions}>
                {!battleJoined ? (
                  <button onClick={joinBattle} className={styles.createBattleBtn}>
                    Join Battle
                  </button>
                ) : (
                  <div className={styles.battleCreated}>
                    <p>✅ Successfully joined the battle!</p>
                    <p className={styles.battleStatus}>
                      You're now participating in today's debate. Submit your arguments and compete for $BATTLE tokens!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Battle History */}
        {battleHistory.length > 0 && (
          <div className={styles.battleSection}>
            <h2 className={styles.sectionTitle}>Recent Battle Results</h2>
            <div className={styles.battleHistory}>
              {battleHistory.slice(0, 3).map((battle, index) => (
                <div key={battle.id} className={styles.historyCard}>
                  <div className={styles.historyHeader}>
                    <h3 className={styles.historyTitle}>{battle.topic.title}</h3>
                    <span className={styles.historyDate}>
                      {new Date(battle.endTime).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className={styles.historyDescription}>
                    {battle.topic.description}
                  </div>
                  
                  {battle.winners && (
                    <div className={styles.winnersSection}>
                      <h4 className={styles.winnersTitle}>Winners</h4>
                      <div className={styles.winnersList}>
                        <div className={styles.winnerItem}>
                          <span className={styles.winnerRank}>1st</span>
                          <span className={styles.winnerAddress}>
                            {battle.winners.first.slice(0, 6)}...{battle.winners.first.slice(-4)}
                          </span>
                          <span className={styles.winnerPrize}>500 $BATTLE</span>
                        </div>
                        <div className={styles.winnerItem}>
                          <span className={styles.winnerRank}>2nd</span>
                          <span className={styles.winnerAddress}>
                            {battle.winners.second.slice(0, 6)}...{battle.winners.second.slice(-4)}
                          </span>
                          <span className={styles.winnerPrize}>300 $BATTLE</span>
                        </div>
                        <div className={styles.winnerItem}>
                          <span className={styles.winnerRank}>3rd</span>
                          <span className={styles.winnerAddress}>
                            {battle.winners.third.slice(0, 6)}...{battle.winners.third.slice(-4)}
                          </span>
                          <span className={styles.winnerPrize}>200 $BATTLE</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className={styles.historyStats}>
                    <span className={styles.statItem}>
                      <strong>{battle.participants}</strong> participants
                    </span>
                    <span className={styles.statItem}>
                      <strong>24h</strong> duration
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}