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
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [casts, setCasts] = useState<any[]>([]);
  const [submittingCast, setSubmittingCast] = useState(false);
  const [castContent, setCastContent] = useState('');
  const [castSide, setCastSide] = useState<'SUPPORT' | 'OPPOSE'>('SUPPORT');
  const [activeTab, setActiveTab] = useState<'battle' | 'arguments' | 'history'>('battle');
  const [hasSubmittedCast, setHasSubmittedCast] = useState(false);
  const [currentBattleId, setCurrentBattleId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(5);

  useEffect(() => {
    initializeApp();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timeRemaining && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev && prev <= 1) {
            // Battle ended, refresh the battle data
            fetchCurrentBattle();
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeRemaining]);

  // Debug battleJoined state changes
  useEffect(() => {
    console.log('🔍 battleJoined state changed to:', battleJoined);
  }, [battleJoined]);

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

  const fetchCasts = async (userToCheck?: any) => {
    try {
      console.log('fetchCasts called with userToCheck:', userToCheck);
      const response = await fetch('/api/battle/submit-cast');
      const data = await response.json();
      
      if (data.success) {
        setCasts(data.casts);
        
        // Check if current user has already submitted a cast
        const userToUse = userToCheck || user;
        
        // If no user from state, try to get from localStorage
        let finalUser = userToUse;
        if (!finalUser && typeof window !== 'undefined') {
          const savedUser = localStorage.getItem('cast-battle-user');
          if (savedUser) {
            finalUser = JSON.parse(savedUser);
          }
        }
        
        console.log('User to use for cast check:', finalUser);
        if (finalUser) {
          const userCast = data.casts.find((cast: any) => cast.userAddress.toLowerCase() === finalUser.address.toLowerCase());
          console.log('Checking cast submission status:', {
            userAddress: finalUser.address,
            castsCount: data.casts.length,
            userCast: userCast,
            hasSubmitted: !!userCast,
            allCasts: data.casts.map(c => ({ address: c.userAddress, content: c.content }))
          });
          setHasSubmittedCast(!!userCast);
        } else {
          console.log('No user found when checking cast submission status');
        }
      }
    } catch (error) {
      console.error('Failed to fetch casts:', error);
    }
  };

  const submitCast = async () => {
    if (!user || !castContent.trim() || castContent.trim().length < 10) {
      setError('Please enter a valid argument (at least 10 characters)');
      return;
    }

    setSubmittingCast(true);
    try {
      const response = await fetch('/api/battle/submit-cast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: user.address,
          content: castContent.trim(),
          side: castSide
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setCastContent('');
        setError(null);
        // Refresh casts to show the new submission
        await fetchCasts(user);
      } else {
        setError(data.error || 'Failed to submit argument');
      }
    } catch (error) {
      console.error('Failed to submit cast:', error);
      setError('Failed to submit argument');
    } finally {
      setSubmittingCast(false);
    }
  };

  useEffect(() => {
    // Initialize Base Account SDK on client side only
    if (typeof window !== 'undefined') {
      try {
        console.log('Initializing Base Account SDK...');
        const baseSDK = createBaseAccountSDK({
          appName: 'NewsCast Battle on Base',
          appLogoUrl: 'https://base.org/favicon.ico',
          appChainIds: [base.id],
        });
        console.log('SDK created:', !!baseSDK);
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

  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        setTopic(data.battle);
        setBattleStatus(data.battle.status);
        
        // Check if this is a new battle
        const isNewBattle = currentBattleId !== data.battle.id;
        if (isNewBattle) {
          console.log('New battle detected:', { oldId: currentBattleId, newId: data.battle.id });
          setCurrentBattleId(data.battle.id);
          setHasSubmittedCast(false); // Reset for new battle
        }
        
        // Calculate time remaining if battle is active
        if (data.battle.status === 'active' && data.battle.endTime) {
          const endTime = new Date(data.battle.endTime).getTime();
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(null);
        }
        
        // Check if user already joined this battle
        if (user && data.battle.participants.some(p => p.user.address === user.address)) {
          setBattleJoined(true);
        }
        
        // Fetch casts for this battle (visible to all users)
        await fetchCasts(user);
      } else {
        setError(data.error || 'No active battle available');
        setTimeRemaining(null);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    console.log('🔍 Sign In button clicked!');
    console.log('SDK status:', !!sdk);
    
    if (!sdk) {
      console.log('❌ SDK not ready');
      setError('Wallet connection not ready. Please try again.');
      return;
    }

    try {
      // Get the provider and create wallet client (following documentation exactly)
      const provider = sdk.getProvider();
      const client = createWalletClient({
        chain: base,
        transport: custom(provider)
      });

      // Get account address (following documentation pattern)
      const addresses = await client.getAddresses();
      console.log('🔍 Available addresses:', addresses);
      let account;
      
      if (!addresses || addresses.length === 0) {
        console.log('🔍 No addresses found, requesting accounts...');
        // Try to request accounts if none are connected
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        console.log('🔍 Requested accounts:', accounts);
        if (!accounts || accounts.length === 0) {
          throw new Error('Please connect your wallet first');
        }
        account = accounts[0];
      } else {
        account = addresses[0];
      }
      
      console.log('🔍 Using account:', account);

      // Sign authentication message (following documentation pattern)
      const message = `Sign in to NewsCast Battle on Base at ${Date.now()}`;
      const signature = await client.signMessage({ 
        account,
        message,
      });

      // Set user data
      const userData = {
        address: account,
        signature: signature,
        timestamp: Date.now()
      };
      
      setUser(userData);
      
      // Save to localStorage for persistence
      localStorage.setItem('cast-battle-user', JSON.stringify(userData));
      
      // Fetch balance
      await fetchBalance(account);
      
      // Refetch current battle to check if user already joined
      await fetchCurrentBattle();

      console.log('User signed in successfully:', account);
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
    
    console.log('🔍 Joining battle for user:', user.address);
    
    try {
      const response = await fetch('/api/battle/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: user.address })
      });
      
      const data = await response.json();
      console.log('🔍 Join battle response:', data);
      console.log('🔍 Response status:', response.status);
      
      if (data.success) {
        setBattleJoined(true);
        console.log('✅ User joined battle for topic:', topic.title);
      } else {
        // Check if user already joined (this is not an error, just update state)
        if (data.error && data.error.includes('already joined')) {
          setBattleJoined(true);
          setError(null); // Clear any existing error
          console.log('✅ User was already in battle, updating state');
          console.log('🔍 battleJoined state set to:', true);
        } else {
          console.log('❌ Join battle error:', data.error);
          setError(data.error);
        }
      }
    } catch (error) {
      console.error('❌ Error joining battle:', error);
      setError(error.message);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.headerWrapper}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>NewsCast Battle</h1>
            <p className={styles.subtitle}>Battle on <span className={styles.baseText}>Base</span> • AI-powered daily debates with $BATTLE token rewards</p>
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
            <div className={styles.signInSection}>
              <p className={styles.signInDescription}>
                Connect your Base Account to join battles and earn $BATTLE tokens
              </p>
              <div className={styles.signInButtonContainer}>
                <SignInWithBaseButton 
                  align="center"
                  variant="solid"
                  colorScheme="light"
                  size="small"
                  disabled={!sdk}
                  onClick={handleSignIn}
                />
              </div>
            </div>
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
              {timeRemaining !== null && battleStatus === 'active' && (
                <div className={styles.countdownTimer}>
                  <span className={styles.timerLabel}>Time Remaining:</span>
                  <span className={styles.timerValue}>{formatTimeRemaining(timeRemaining)}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Navigation Menu */}
          <nav className={styles.navigation}>
            <button 
              className={`${styles.navButton} ${activeTab === 'battle' ? styles.active : ''}`}
              onClick={() => setActiveTab('battle')}
            >
              Current Battle
            </button>
            <button 
              className={`${styles.navButton} ${activeTab === 'arguments' ? styles.active : ''}`}
              onClick={() => setActiveTab('arguments')}
            >
              Submitted Arguments ({casts.length})
            </button>
            <button 
              className={`${styles.navButton} ${activeTab === 'history' ? styles.active : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Previous Battles
            </button>
          </nav>
          
          {/* Tab Content */}
          {activeTab === 'battle' && (
            <>
              {loading && (
                <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                  <p>AI is curating today's battle topic...</p>
                </div>
              )}

              {error && (
                <div className={styles.error}>
                  ⚠️ {error}
                  <button onClick={joinBattle} className={styles.retryBtn}>Retry</button>
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
                {console.log('UI Logic Check:', { hasSubmittedCast, battleJoined, user: user?.address })}
                {hasSubmittedCast ? (
                  <div className={styles.thankYouMessage}>
                    <h3>🎉 Thank You for Participating!</h3>
                    <p className={styles.thankYouText}>
                      You've successfully submitted your argument for this battle. Good luck in the competition!
                    </p>
                    <p className={styles.thankYouNote}>
                      When this battle ends and a new one begins, you'll be able to participate again.
                    </p>
                  </div>
                ) : !battleJoined ? (
                  <button onClick={joinBattle} className={styles.createBattleBtn}>
                    Join Battle
                  </button>
                ) : (
                  <div className={styles.battleCreated}>
                    <p>✅ Successfully joined the battle!</p>
                    <p className={styles.battleStatus}>
                      You're now participating in today's debate. Submit your arguments and compete for $BATTLE tokens!
                    </p>
                    
                    {/* Cast Submission Form */}
                    <div className={styles.castSubmissionForm}>
                      <h4>Submit Your Argument</h4>
                      <div className={styles.sideSelection}>
                        <label>
                          <input
                            type="radio"
                            name="side"
                            value="SUPPORT"
                            checked={castSide === 'SUPPORT'}
                            onChange={(e) => setCastSide(e.target.value as 'SUPPORT' | 'OPPOSE')}
                          />
                          <span className={styles.sideOption}>Support</span>
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="side"
                            value="OPPOSE"
                            checked={castSide === 'OPPOSE'}
                            onChange={(e) => setCastSide(e.target.value as 'SUPPORT' | 'OPPOSE')}
                          />
                          <span className={styles.sideOption}>Oppose</span>
                        </label>
                      </div>
                      <textarea
                        className={styles.castTextarea}
                        placeholder="Write your argument here... (minimum 10 characters)"
                        value={castContent}
                        onChange={(e) => setCastContent(e.target.value)}
                        rows={4}
                        maxLength={500}
                      />
                      <div className={styles.castActions}>
                        <span className={styles.charCount}>{castContent.length}/500</span>
                        <button
                          onClick={submitCast}
                          disabled={submittingCast || castContent.trim().length < 10}
                          className={styles.submitCastBtn}
                        >
                          {submittingCast ? 'Submitting...' : 'Submit Argument'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
            </>
          )}

          {activeTab === 'arguments' && (
            <div className={styles.castsSection}>
          <h2 className={styles.sectionTitle}>Submitted Arguments</h2>
          {casts.length > 0 ? (
            <div className={styles.castsList}>
              {casts.map((cast) => (
                <div key={cast.id} className={`${styles.castCard} ${styles[cast.side.toLowerCase()]}`}>
                  <div className={styles.castHeader}>
                    <span className={styles.castSide}>{cast.side}</span>
                    <span className={styles.castUser}>{cast.userAddress.slice(0, 6)}...{cast.userAddress.slice(-4)}</span>
                    <span className={styles.castTime}>
                      {new Date(cast.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.castContent}>
                    {cast.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noCastsMessage}>
              <p>No arguments submitted yet. Be the first to share your thoughts!</p>
            </div>
          )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className={styles.historySection}>
              <h2 className={styles.sectionTitle}>Previous Battles & Winners</h2>
              {battleHistory.length > 0 ? (
                <>
                  <div className={styles.battleHistory}>
                    {battleHistory
                      .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
                      .map((battle, index) => (
                        <div key={battle.id} className={styles.historyCard}>
                          <div className={styles.historyHeader}>
                            <h3 className={styles.historyTitle}>{battle.topic.title}</h3>
                            <span className={styles.historyDate}>
                              {new Date(battle.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className={styles.historyContent}>
                            <p className={styles.historyDescription}>{battle.topic.description}</p>
                            <div className={styles.historyStats}>
                              <span className={styles.statItem}>
                                <strong>{battle.participants.length}</strong> participants
                              </span>
                              <span className={styles.statItem}>
                                <strong>{battle.casts?.length || 0}</strong> arguments
                              </span>
                            </div>
                            {battle.winners && battle.winners.length > 0 ? (
                              <div className={styles.winnersSection}>
                                <h4 className={styles.winnersTitle}>🏆 Winners</h4>
                                <div className={styles.winnersList}>
                                  {battle.winners.map((winner, winnerIndex) => (
                                    <div key={winnerIndex} className={styles.winnerCard}>
                                      <span className={styles.winnerRank}>#{winnerIndex + 1}</span>
                                      <span className={styles.winnerAddress}>
                                        {winner.userAddress.slice(0, 6)}...{winner.userAddress.slice(-4)}
                                      </span>
                                      <span className={styles.winnerScore}>
                                        Score: {winner.score?.toFixed(2) || 'N/A'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className={styles.noWinners}>
                                <p>No winners determined yet</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {/* Pagination */}
                  {battleHistory.length > historyPageSize && (
                    <div className={styles.pagination}>
                      <button 
                        className={styles.paginationBtn}
                        onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                        disabled={historyPage === 1}
                      >
                        Previous
                      </button>
                      <span className={styles.paginationInfo}>
                        Page {historyPage} of {Math.ceil(battleHistory.length / historyPageSize)}
                      </span>
                      <button 
                        className={styles.paginationBtn}
                        onClick={() => setHistoryPage(Math.min(Math.ceil(battleHistory.length / historyPageSize), historyPage + 1))}
                        disabled={historyPage >= Math.ceil(battleHistory.length / historyPageSize)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.noHistoryMessage}>
                  <p>No previous battles found. Check back after the first battle completes!</p>
                </div>
              )}
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