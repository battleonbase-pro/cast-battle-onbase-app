"use client";
import { useState, useEffect } from "react";
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { createBaseAccountSDK } from '@base-org/account';
import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styles from "./page.module.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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

interface Cast {
  id: string;
  content: string;
  side: 'SUPPORT' | 'OPPOSE';
  userAddress: string;
  createdAt: string;
}

interface BattleHistory {
  id: string;
  topic: DebateTopic;
  participants: any[];
  casts: Cast[];
  createdAt: string;
  endTime: string;
  status: string;
  winners: any[];
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [sdk, setSdk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<DebateTopic | null>(null);
  const [battleJoined, setBattleJoined] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [battleEndTime, setBattleEndTime] = useState<number | null>(null);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [submittingCast, setSubmittingCast] = useState(false);
  const [castContent, setCastContent] = useState('');
  const [castSide, setCastSide] = useState<'SUPPORT' | 'OPPOSE'>('SUPPORT');
  const [activeTab, setActiveTab] = useState<'battle' | 'arguments' | 'history'>('battle');
  const [hasSubmittedCast, setHasSubmittedCast] = useState(false);
  const [battleHistory, setBattleHistory] = useState<BattleHistory[]>([]);
  const [sentimentData, setSentimentData] = useState({ support: 0, oppose: 0, supportPercent: 0, opposePercent: 0 });
  const [sentimentHistory, setSentimentHistory] = useState<Array<{
    timestamp: number;
    support: number;
    oppose: number;
    supportPercent: number;
    opposePercent: number;
  }>>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'polling' | 'disconnected'>('connecting');
  const [pulseAnimation, setPulseAnimation] = useState(0);

  useEffect(() => {
    initializeApp();
    const cleanupSSE = setupSSEConnection();
    
    // Initialize Base Account SDK on client side only
    if (typeof window !== 'undefined') {
      try {
        // Check if ethereum provider is available
        if (!window.ethereum) {
          console.log('No Ethereum provider found. Wallet connection will not be available.');
          // Continue without wallet - app can still be used for viewing battles
          return;
        }

        const baseSDK = createBaseAccountSDK({
          appName: 'NewsCast Battle on Base',
          appIcon: '/sphere.svg',
          appUrl: window.location.origin,
          chain: base,
          client: createWalletClient({
            chain: base,
            transport: custom(window.ethereum)
          })
        });
        setSdk(baseSDK);
        
        // Check for existing authentication
        const savedUser = localStorage.getItem('cast-battle-user');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to initialize Base Account SDK:', error);
        setError('Failed to initialize wallet connection');
      }
    }

    // Cleanup function
    return () => {
      if (cleanupSSE) {
        cleanupSSE();
      }
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!battleEndTime) return;

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((battleEndTime - now) / 1000));
      setTimeRemaining(remaining);
    };

    // Update immediately
    updateCountdown();

    // Set up interval to update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [battleEndTime]);

  // Pulse animation effect for chart end points
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setPulseAnimation(prev => prev + 1);
    }, 1000);

    return () => clearInterval(pulseInterval);
  }, []);

  const initializeApp = async () => {
    try {
      await Promise.all([
        fetchCurrentBattle(),
        fetchBattleHistory()
      ]);
    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  const setupSSEConnection = () => {
    if (typeof window === 'undefined') return;

    // Check if EventSource is supported
    if (typeof EventSource === 'undefined') {
      console.log('EventSource not supported, using polling fallback');
      setConnectionStatus('polling');
      return setupPollingFallback();
    }

    try {
      const eventSource = new EventSource('/api/battle/sentiment-stream');
      
      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setConnectionStatus('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'sentiment_update') {
            // Update sentiment data
            setSentimentData(data.sentiment);
            
            // Update sentiment history for chart
            const historyEntry = {
              timestamp: data.timestamp,
              ...data.sentiment
            };
            
            setSentimentHistory(prev => {
              const newHistory = [...prev, historyEntry];
              return newHistory.slice(-20); // Keep last 20 data points
            });

            // Update casts if provided
            if (data.casts) {
              setCasts(data.casts);
            }

            // Update user submission status if provided
            if (data.userSubmissionStatus !== undefined && user) {
              setHasSubmittedCast(data.userSubmissionStatus);
            }
          } else if (data.type === 'heartbeat') {
            // Heartbeat received, connection is alive
            setConnectionStatus('connected');
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (eventSource.readyState === EventSource.CLOSED) {
            console.log('Attempting to reconnect SSE...');
            setupSSEConnection();
          }
        }, 5000);
      };

      // Return cleanup function
      return () => {
        eventSource.close();
        setConnectionStatus('disconnected');
      };
    } catch (error) {
      console.error('Failed to setup SSE connection:', error);
      setConnectionStatus('polling');
      return setupPollingFallback();
    }
  };

  const setupPollingFallback = () => {
    // Fallback polling for browsers that don't support SSE well
    const pollInterval = setInterval(async () => {
      try {
        await fetchCasts();
        setConnectionStatus('polling');
      } catch (error) {
        console.error('Polling error:', error);
        setConnectionStatus('disconnected');
      }
    }, 10000); // Poll every 10 seconds

    // Return cleanup function
    return () => {
      clearInterval(pollInterval);
    };
  };

  const fetchCurrentBattle = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/battle/current');
      const data = await response.json();
      
      if (data.success && data.battle) {
        setTopic(data.battle);
        
        // Set battle end time for countdown timer
        const endTime = new Date(data.battle.endTime).getTime();
        setBattleEndTime(endTime);
        
        await fetchCasts();
      } else {
        setError(data.error || 'No active battle available');
      }
    } catch (error) {
      console.error('Error fetching battle:', error);
      setError('Failed to fetch battle data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCasts = async () => {
    try {
      const response = await fetch('/api/battle/submit-cast');
      const data = await response.json();
      
      if (data.success) {
        setCasts(data.casts);
        
        // Calculate sentiment data
        const support = data.casts.filter((cast: Cast) => cast.side === 'SUPPORT').length;
        const oppose = data.casts.filter((cast: Cast) => cast.side === 'OPPOSE').length;
        const total = support + oppose;
        
        if (total > 0) {
          const sentiment = {
            support,
            oppose,
            supportPercent: Math.round((support / total) * 100),
            opposePercent: Math.round((oppose / total) * 100)
          };
          
          setSentimentData(sentiment);
          
          // Add to history
          const historyEntry = {
            timestamp: Date.now(),
            ...sentiment
          };
          
          setSentimentHistory(prev => {
            const newHistory = [...prev, historyEntry];
            return newHistory.slice(-20);
          });
        }
        
        // Check if user has submitted
        if (user) {
          const userCast = data.casts.find((cast: Cast) => 
            cast.userAddress.toLowerCase() === user.address.toLowerCase()
          );
          setHasSubmittedCast(!!userCast);
        } else {
          // Check localStorage for user data if state is not ready
          const savedUser = localStorage.getItem('cast-battle-user');
          if (savedUser) {
            const userData = JSON.parse(savedUser);
            const userCast = data.casts.find((cast: Cast) => 
              cast.userAddress.toLowerCase() === userData.address.toLowerCase()
            );
            setHasSubmittedCast(!!userCast);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch casts:', error);
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

  const joinBattle = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/battle/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: user.address })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBattleJoined(true);
        setError(null);
      } else {
        if (data.error.includes('already joined')) {
          setBattleJoined(true);
          setError(null);
        } else {
          setError(data.error);
        }
      }
    } catch (error) {
      console.error('Error joining battle:', error);
      setError('Failed to join battle');
    } finally {
      setLoading(false);
    }
  };

  const submitCast = async () => {
    if (!user || !castContent.trim()) return;
    
    try {
      setSubmittingCast(true);
      const response = await fetch('/api/battle/submit-cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: user.address,
          content: castContent.trim(),
          side: castSide
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHasSubmittedCast(true);
        setCastContent('');
        await fetchCasts();
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Error submitting cast:', error);
      setError('Failed to submit argument');
    } finally {
      setSubmittingCast(false);
    }
  };

  const handleSignIn = async () => {
    if (!sdk) {
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
      let account;
      
      if (!addresses || addresses.length === 0) {
        // Try to request accounts if none are connected
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) {
          throw new Error('Please connect your wallet first');
        }
        account = accounts[0];
      } else {
        account = addresses[0];
      }

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
      
      // Refetch current battle to check if user already joined
      await fetchCurrentBattle();
    } catch (error) {
      console.error('Sign in failed:', error);
      setError(error.message || 'Sign in failed');
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setBattleJoined(false);
    setHasSubmittedCast(false);
    localStorage.removeItem('cast-battle-user');
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

  // Chart.js configuration
  const chartData = {
    labels: sentimentHistory.map((_, index) => {
      if (sentimentHistory.length <= 1) return 'Now';
      const timeDiff = Date.now() - sentimentHistory[index].timestamp;
      const minutes = Math.floor(timeDiff / 60000);
      return minutes === 0 ? 'Now' : `${minutes}m ago`;
    }),
    datasets: [
      {
        label: 'Support %',
        data: sentimentHistory.map(point => point.supportPercent),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? 6 + Math.sin(pulseAnimation * Math.PI / 2) * 2 : 3
        ),
        pointHoverRadius: 8,
        pointBackgroundColor: sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? '#10b981' : '#10b981'
        ),
        pointBorderColor: sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? '#ffffff' : '#10b981'
        ),
        pointBorderWidth: sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? 3 : 1
        ),
      },
      {
        label: 'Oppose %',
        data: sentimentHistory.map(point => point.opposePercent),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? 6 + Math.sin(pulseAnimation * Math.PI / 2) * 2 : 3
        ),
        pointHoverRadius: 8,
        pointBackgroundColor: sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? '#ef4444' : '#ef4444'
        ),
        pointBorderColor: sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? '#ffffff' : '#ef4444'
        ),
        pointBorderWidth: sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? 3 : 1
        ),
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 11, weight: '500' as const }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#6b7280' } },
      y: {
        beginAtZero: true,
        max: 105,
        grid: { color: '#f3f4f6', drawBorder: false },
        ticks: { 
          font: { size: 9 }, 
          color: '#6b7280', 
          callback: (value: any) => {
            if (value <= 100) {
              return value + '%';
            }
            return '';
          },
          stepSize: 20
        }
      }
    },
    interaction: { intersect: false, mode: 'index' as const },
    elements: { point: { hoverBackgroundColor: '#ffffff', hoverBorderWidth: 2 } }
  };

  return (
    <div className={styles.container}>
      {/* Minimalist Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>NewsCast Battle</h1>
            <p className={styles.subtitle}>Battle on <span className={styles.baseText}>Base</span></p>
          </div>
          {user ? (
            <div className={styles.userCompact}>
              <span className={styles.userAddress}>{user.address.slice(0, 6)}...{user.address.slice(-4)}</span>
              <button 
                onClick={handleSignOut}
                className={styles.signOutBtn}
              >
                Sign Out
              </button>
        </div>
          ) : sdk ? (
            <div className={styles.signInWrapper}>
              <SignInWithBaseButton 
                size="small"
                variant="solid"
                colorScheme="light"
                onClick={handleSignIn}
              />
            </div>
          ) : (
            <div className={styles.signInWrapper}>
              <button 
                className={styles.signOutBtn}
                disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                title="Install a wallet extension (Coinbase Wallet, MetaMask, etc.) to participate in battles"
              >
                {typeof window !== 'undefined' && !window.ethereum ? 'Install Wallet' : 'Wallet Loading...'}
              </button>
            </div>
          )}
                </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : error ? (
          <div className={styles.error}>
            <p>⚠️ {error}</p>
            <button onClick={fetchCurrentBattle} className={styles.retryBtn}>Retry</button>
              </div>
        ) : topic ? (
          <div className={styles.battleCard}>
            {/* Battle Header */}
            <div className={styles.battleHeader}>
              <div className={styles.battleStatus}>
                <span className={`${styles.statusBadge} ${styles.active}`}>ACTIVE</span>
                {timeRemaining && (
                  <span className={styles.timer}>{formatTimeRemaining(timeRemaining)}</span>
                )}
              </div>
              <h2 className={styles.topicTitle}>{topic.title}</h2>
              <p className={styles.topicDescription}>{topic.description}</p>

              {/* Debate Points */}
              <div className={styles.debatePoints}>
                <div className={`${styles.debateSide} ${styles.support}`}>
                  <h4>Support</h4>
                  <ul>
                    {topic.debatePoints?.Support?.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div className={`${styles.debateSide} ${styles.oppose}`}>
                  <h4>Oppose</h4>
                  <ul>
                    {topic.debatePoints?.Oppose?.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
                </div>
              </div>

            {/* Quick Actions */}
            <div className={styles.quickActions}>
              {!battleJoined && !hasSubmittedCast && (
                <button 
                  onClick={joinBattle} 
                  className={styles.joinBtn}
                  disabled={!user}
                >
                  {user ? 'Join Battle' : 'Sign in to Join Battle'}
                </button>
              )}
              {battleJoined && !hasSubmittedCast && (
                <div className={styles.submitForm}>
                  <div className={styles.sideToggle}>
                    <button 
                      className={`${styles.sideBtn} ${castSide === 'SUPPORT' ? styles.active : ''}`}
                      onClick={() => setCastSide('SUPPORT')}
                    >
                      Support
                    </button>
                    <button 
                      className={`${styles.sideBtn} ${castSide === 'OPPOSE' ? styles.active : ''}`}
                      onClick={() => setCastSide('OPPOSE')}
                    >
                      Oppose
                    </button>
                  </div>
                  <textarea
                    className={styles.argumentInput}
                    placeholder="Your argument..."
                    value={castContent}
                    onChange={(e) => setCastContent(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <button
                    onClick={submitCast}
                    disabled={submittingCast || castContent.trim().length < 10}
                    className={styles.submitBtn}
                  >
                    {submittingCast ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              )}
              {hasSubmittedCast && (
                <div className={styles.thankYou}>
                  <span>✅ Thank you for participating!</span>
                </div>
              )}
            </div>

            {/* Compact Navigation */}
            <nav className={styles.compactNav}>
              <button 
                className={`${styles.navBtn} ${activeTab === 'battle' ? styles.active : ''}`}
                onClick={() => setActiveTab('battle')}
              >
                Battle
              </button>
              <button 
                className={`${styles.navBtn} ${activeTab === 'arguments' ? styles.active : ''}`}
                onClick={() => setActiveTab('arguments')}
              >
                Arguments ({casts.length})
              </button>
              <button 
                className={`${styles.navBtn} ${activeTab === 'history' ? styles.active : ''}`}
                onClick={() => setActiveTab('history')}
              >
                History
              </button>
            </nav>

            {/* Tab Content */}
            {activeTab === 'battle' && (
              <div className={styles.tabContent}>
                {casts.length > 0 && (
                  <div className={styles.compactGraph}>
                    <div className={styles.graphHeader}>
                      <h3>Market Sentiment</h3>
                      <span className={`${styles.connectionStatus} ${styles[connectionStatus]}`}>
                        {connectionStatus === 'connected' && '🟢 Live'}
                        {connectionStatus === 'polling' && '🟡 Polling'}
                        {connectionStatus === 'connecting' && '🟠 Connecting'}
                        {connectionStatus === 'disconnected' && '🔴 Offline'}
                      </span>
                    </div>
                    <div className={styles.chartContainer}>
                      <Line data={chartData} options={chartOptions} />
                    </div>
                    <div className={styles.compactStats}>
                      <span>Support: {sentimentData.supportPercent}%</span>
                      <span>Oppose: {sentimentData.opposePercent}%</span>
                      <span>Total: {sentimentData.support + sentimentData.oppose}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'arguments' && (
              <div className={styles.tabContent}>
                <div className={styles.argumentsList}>
                  {casts.length > 0 ? (
                    casts.map((cast) => (
                      <div key={cast.id} className={styles.argumentCard}>
                        <div className={styles.argumentHeader}>
                          <span className={`${styles.argumentSide} ${styles[cast.side.toLowerCase()]}`}>
                            {cast.side}
                          </span>
                          <span className={styles.argumentUser}>
                            {cast.userAddress.slice(0, 6)}...{cast.userAddress.slice(-4)}
                          </span>
                        </div>
                        <div className={styles.argumentContent}>{cast.content}</div>
            </div>
                    ))
                  ) : (
                    <div className={styles.loading}>No arguments submitted yet.</div>
          )}
        </div>
      </div>
            )}

            {activeTab === 'history' && (
              <div className={styles.tabContent}>
                <div className={styles.historyList}>
                  {battleHistory.length > 0 ? (
                    battleHistory.slice(0, 5).map((battle) => (
                      <div key={battle.id} className={styles.historyCard}>
                        <h3 className={styles.historyTitle}>{battle.topic.title}</h3>
                        <span className={styles.historyDate}>
                          {new Date(battle.createdAt).toLocaleDateString()}
                        </span>
                        <div className={styles.historyStats}>
                          <span>{battle.participants.length} participants</span>
                          <span>{battle.casts.length} arguments</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.loading}>No previous battles.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.loading}>No active battle available.</div>
        )}
      </main>
    </div>
  );
}
