"use client";
import { useState, useEffect, useCallback } from "react";
import BaseAccountAuth from '../components/BaseAccountAuth';
import { baseAccountAuthService, BaseAccountUser } from '../lib/services/base-account-auth-service';
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

interface Battle {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  sourceUrl: string;
  imageUrl: string;
  thumbnail: string;
  status: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  maxParticipants: number;
  debatePoints: {
    Support: string[];
    Oppose: string[];
  };
  participants: any[];
  casts: any[];
  winners: any[];
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
  title: string;
  description: string;
  category: string;
  source: string;
  participants: number;
  casts: number;
  createdAt: string;
  endTime: string;
  status: string;
  winnerAddress?: string;
  insights?: string;
  winner?: {
    address: string;
    username?: string;
    position: number;
    prize?: string;
    pointsAwarded: number;
  };
  winners: Array<{
    address: string;
    username?: string;
    position: number;
    prize?: string;
    pointsAwarded: number;
  }>;
  completedAt: string;
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [baseAccountUser, setBaseAccountUser] = useState<BaseAccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBattle, setCurrentBattle] = useState<Battle | null>(null);
  const [battleLoading, setBattleLoading] = useState(false);
  
  // Tab and UI state
  const [activeTab, setActiveTab] = useState<'debate' | 'arguments' | 'history' | 'leaderboard'>('debate');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [battleEndTime, setBattleEndTime] = useState<number | null>(null);
  
  // Battle data
  const [casts, setCasts] = useState<Cast[]>([]);
  const [battleHistory, setBattleHistory] = useState<BattleHistory[]>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{
    address: string;
    username?: string;
    points: number;
    rank: number;
    participationCount: number;
    winCount: number;
    recentWins: Array<{
      battleTitle: string;
      battleCategory: string;
      position: number;
      prize?: string;
      wonAt: string;
    }>;
  }>>([]);
  
  // Real-time data
  const [sentimentData, setSentimentData] = useState({ support: 0, oppose: 0, supportPercent: 0, opposePercent: 0 });
  const [sentimentHistory, setSentimentHistory] = useState<Array<{
    timestamp: number;
    support: number;
    oppose: number;
    supportPercent: number;
    opposePercent: number;
  }>>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'polling' | 'disconnected'>('connecting');
  
  // User interaction state
  const [hasSubmittedCast, setHasSubmittedCast] = useState(false);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [pointsAnimation, setPointsAnimation] = useState(false);
  
  // Cast submission state
  const [battleJoined, setBattleJoined] = useState(false);
  const [submittingCast, setSubmittingCast] = useState(false);
  const [castContent, setCastContent] = useState('');
  const [castSide, setCastSide] = useState<'SUPPORT' | 'OPPOSE'>('SUPPORT');
  
  // SSE and polling state
  const [isMobile, setIsMobile] = useState(false);
  const [sseConnection, setSseConnection] = useState<EventSource | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

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

  // Fetch current battle
  useEffect(() => {
    const fetchCurrentBattle = async () => {
      setBattleLoading(true);
      try {
        const response = await fetch('/api/battle/current');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.battle) {
            setCurrentBattle(data.battle);
            // Set battle end time for countdown timer
            const endTime = new Date(data.battle.endTime).getTime();
            setBattleEndTime(endTime);
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch current battle:', error);
      } finally {
        setBattleLoading(false);
      }
    };

    fetchCurrentBattle();
  }, []);

  // Fetch casts
  const fetchCasts = useCallback(async () => {
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
        
        // Check if user has submitted and is a participant
        if (baseAccountUser) {
          console.log('🔍 Checking if user has submitted cast:', {
            userAddress: baseAccountUser.address,
            casts: data.casts.map((c: Cast) => ({ id: c.id, userAddress: c.userAddress, content: c.content }))
          });
          
          const userCast = data.casts.find((cast: Cast) => 
            cast.userAddress && baseAccountUser.address && 
            cast.userAddress.toLowerCase() === baseAccountUser.address.toLowerCase()
          );
          
          console.log('🔍 User cast found:', userCast);
          console.log('🔍 Setting hasSubmittedCast to:', !!userCast);
          setHasSubmittedCast(!!userCast);
          
          // If user has submitted a cast, they are definitely a participant
          if (userCast) {
            console.log('🔍 User has submitted cast, setting battleJoined to true');
            setBattleJoined(true);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch casts:', error);
    }
  }, [baseAccountUser]);

  // Fetch battle history
  const fetchBattleHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/battle/history');
      const data = await response.json();
      
      if (data.success) {
        setBattleHistory(data.battles);
      }
    } catch (error) {
      console.error('Failed to fetch battle history:', error);
    }
  }, []);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch('/api/user/leaderboard');
      const data = await response.json();
      
      if (data.success) {
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  }, []);

  // Fetch user points
  const fetchUserPoints = useCallback(async (address: string) => {
    try {
      console.log('🔍 Fetching points for address:', address);
      const response = await fetch(`/api/user/points?address=${encodeURIComponent(address)}`);
      const data = await response.json();
      
      console.log('📊 Points API response:', data);
      
      if (data.success) {
        setUserPoints(data.points || 0);
        console.log('✅ User points fetched:', data.points);
      } else {
        console.error('❌ Failed to fetch user points:', data.error);
        setUserPoints(0);
      }
    } catch (error) {
      console.error('❌ Failed to fetch user points:', error);
      setUserPoints(0);
    }
  }, []);

  // Join battle
  const joinBattle = async () => {
    if (!baseAccountUser) return;
    
    try {
      const response = await fetch('/api/battle/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: baseAccountUser.address
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBattleJoined(true);
        console.log('✅ Successfully joined battle');
      } else {
        setError(data.error || 'Failed to join battle');
      }
    } catch (error) {
      console.error('Failed to join battle:', error);
      setError('Failed to join battle. Please try again.');
    }
  };

  // Submit cast
  const submitCast = async () => {
    if (!baseAccountUser || !castContent.trim()) return;
    
    try {
      setSubmittingCast(true);
      const response = await fetch('/api/battle/submit-cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: baseAccountUser.address,
          content: castContent.trim(),
          side: castSide
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHasSubmittedCast(true);
        setCastContent('');
        
        // Update points and show animation
        if (data.points !== undefined) {
          setUserPoints(data.points);
          setPointsAnimation(true);
          setTimeout(() => setPointsAnimation(false), 2000);
        }
        
        // Refresh casts immediately
        await fetchCasts();
        
        // Update sentiment data
        const support = casts.filter(cast => cast.side === 'SUPPORT').length + 1; // +1 for new cast
        const oppose = casts.filter(cast => cast.side === 'OPPOSE').length + (castSide === 'OPPOSE' ? 1 : 0);
        const total = support + oppose;
        
        if (total > 0) {
          const newSentiment = {
            support,
            oppose,
            supportPercent: Math.round((support / total) * 100),
            opposePercent: Math.round((oppose / total) * 100)
          };
          
          setSentimentData(newSentiment);
          setSentimentHistory(prev => [...prev.slice(-19), {
            timestamp: Date.now(),
            ...newSentiment
          }]);
        }
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to submit cast:', error);
      setError('Failed to submit cast. Please try again.');
    } finally {
      setSubmittingCast(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (currentBattle) {
      console.log('🔄 Loading initial data - currentBattle:', currentBattle.id);
      console.log('🔄 baseAccountUser:', baseAccountUser?.address);
      console.log('🔄 hasSubmittedCast before fetch:', hasSubmittedCast);
      fetchCasts();
      fetchBattleHistory();
    }
  }, [currentBattle, fetchCasts, fetchBattleHistory]);

  // Fetch user points when authenticated
  useEffect(() => {
    if (baseAccountUser?.address) {
      fetchUserPoints(baseAccountUser.address);
    }
  }, [baseAccountUser, fetchUserPoints]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // SSE connection management
  useEffect(() => {
    if (!currentBattle) return;

    const connectSSE = () => {
      if (isMobile) {
        console.log('📱 Mobile device detected - using polling fallback');
        setConnectionStatus('polling');
        
        // Start polling every 30 seconds
        const interval = setInterval(async () => {
          try {
            await fetchCasts();
            await fetchBattleHistory();
            if (baseAccountUser?.address) {
              await fetchUserPoints(baseAccountUser.address);
            }
          } catch (error) {
            console.error('Polling error:', error);
          }
        }, 30000);
        
        setPollingInterval(interval);
        
        // Initial fetch
        fetchCasts();
        fetchBattleHistory();
        if (baseAccountUser?.address) {
          fetchUserPoints(baseAccountUser.address);
        }
        
      } else {
        console.log('🖥️ Desktop device detected - using SSE');
        setConnectionStatus('connecting');
        
        const eventSource = new EventSource('/api/battle/state-stream');
        setSseConnection(eventSource);

        eventSource.onopen = () => {
          console.log('✅ SSE connection established');
          setConnectionStatus('connected');
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📡 SSE event received:', data.type);
            
            switch (data.type) {
              case 'CONNECTION_ESTABLISHED':
                console.log('🔌 SSE connection confirmed');
                break;
              case 'TIMER_UPDATE':
                if (data.data.timeRemaining !== undefined) {
                  setTimeRemaining(data.data.timeRemaining);
                }
                break;
              case 'CAST_SUBMITTED':
                // Refresh casts when new cast is submitted
                fetchCasts();
                break;
              case 'BATTLE_COMPLETED':
                // Refresh battle data when battle completes
                fetchCasts();
                fetchBattleHistory();
                break;
              case 'SENTIMENT_UPDATE':
                if (data.data.sentiment) {
                  setSentimentData(data.data.sentiment);
                  setSentimentHistory(prev => [...prev.slice(-19), {
                    timestamp: Date.now(),
                    ...data.data.sentiment
                  }]);
                }
                break;
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ SSE connection error:', error);
          setConnectionStatus('disconnected');
          
          // Fallback to polling on error
          console.log('🔄 Falling back to polling due to SSE error');
          eventSource.close();
          setSseConnection(null);
          
          const interval = setInterval(async () => {
            try {
              await fetchCasts();
              await fetchBattleHistory();
              if (baseAccountUser?.address) {
                await fetchUserPoints(baseAccountUser.address);
              }
            } catch (error) {
              console.error('Polling error:', error);
            }
          }, 30000);
          
          setPollingInterval(interval);
          setConnectionStatus('polling');
        };
      }
    };

    connectSSE();

    // Cleanup function
    return () => {
      if (sseConnection) {
        console.log('🔌 Closing SSE connection');
        sseConnection.close();
        setSseConnection(null);
      }
      if (pollingInterval) {
        console.log('⏰ Clearing polling interval');
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [currentBattle, isMobile, baseAccountUser, fetchCasts, fetchBattleHistory, fetchUserPoints]);

  // Chart data configuration
  const chartData = {
    labels: sentimentHistory.map((_, index) => ''),
    datasets: [
      {
        label: 'Support',
        data: sentimentHistory.map(data => data.supportPercent),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Oppose',
        data: sentimentHistory.map(data => data.opposePercent),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          },
        },
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };

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
      {/* Authentication Landing Page */}
      {!baseAccountUser ? (
        <section className={styles.authSection}>
          <BaseAccountAuth
            onAuthSuccess={(user) => {
              if (user) {
                console.log('🔐 Auth success callback - user:', user.address);
                console.log('🔐 Current hasSubmittedCast state:', hasSubmittedCast);
                console.log('🔐 User object:', user);
                setBaseAccountUser(user);
                setIsAuthenticated(true);
                console.log('✅ Base Account authentication successful');
                
                // Fetch user points immediately after authentication
                console.log('🔍 Fetching points immediately after auth...');
                fetchUserPoints(user.address);
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

          {error && (
            <div className={styles.error}>
              <p>⚠️ {error}</p>
              <button onClick={() => setError(null)} className={styles.retryBtn}>Dismiss</button>
            </div>
          )}
        </section>
      ) : (
        /* Main App Content - Only visible when authenticated */
        <section className={styles.appSection}>
          {/* App Header */}
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
                      <span className="text-blue-500">🔵</span>
                      <span>{baseAccountUser.address.slice(0, 6)}...{baseAccountUser.address.slice(-4)}</span>
                    </div>
                  </span>
                  <span className={styles.userPoints}>
                    🔵 {userPoints} pts
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
            </div>
          </header>

          {/* Thank You Message - Prominently displayed below header */}
          {hasSubmittedCast && (
            <div className={styles.thankYouBanner}>
              <div className={styles.thankYouContent}>
                <span className={styles.thankYouIcon}>✅</span>
                <span className={styles.thankYouText}>Thank you for participating! Good luck winning the pot! 🍀</span>
              </div>
            </div>
          )}

          {/* Main App Content */}
          <main className={styles.appMain}>

        {battleLoading ? (
          <div className={styles.battleCard}>
            <div className={styles.battleHeader}>
              <h2 className={styles.topicTitle}>Loading battle...</h2>
              <p className={styles.topicDescription}>Fetching the latest debate topic...</p>
            </div>
          </div>
        ) : currentBattle ? (
          <div className={styles.battleCard}>
            <div className={styles.battleHeader}>
              <div className={styles.topicMeta}>
                <span className={styles.topicCategory}>{currentBattle.category}</span>
                <span className={styles.topicSource}>Source: {currentBattle.source}</span>
                {timeRemaining !== null && (
                  <span className={styles.timer}>
                    ⏰ {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
              <h2 className={styles.topicTitle}>{currentBattle.title}</h2>
              <p className={styles.topicDescription}>{currentBattle.description}</p>
            </div>

            <div className={styles.topicContent}>
              {currentBattle.imageUrl && (
                <img 
                  src={currentBattle.imageUrl} 
                  alt={currentBattle.title}
                  className={styles.topicImage}
                />
              )}
              
              <div className={styles.debatePoints}>
                <div className={`${styles.debateSide} ${styles.oppose}`}>
                  <h4>❌ Oppose</h4>
                  <ul>
                    {currentBattle.debatePoints.Oppose.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
                
                <div className={`${styles.debateSide} ${styles.support}`}>
                  <h4>✅ Support</h4>
                  <ul>
                    {currentBattle.debatePoints.Support.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <nav className={styles.tabNav}>
              <button 
                className={`${styles.navBtn} ${activeTab === 'debate' ? styles.active : ''}`}
                onClick={() => setActiveTab('debate')}
              >
                Debate
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
              <button 
                className={`${styles.navBtn} ${activeTab === 'leaderboard' ? styles.active : ''}`}
                onClick={() => {
                  setActiveTab('leaderboard');
                  fetchLeaderboard();
                }}
              >
                Leaderboard
              </button>
            </nav>

            {/* Tab Content */}
            {activeTab === 'debate' && (
              <div className={styles.tabContent}>
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
                    {casts.length === 0 && (
                      <span className={styles.emptyState}>No votes yet - be the first to participate!</span>
                    )}
                  </div>
                </div>
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
                            {cast.userAddress ? `${cast.userAddress.slice(0, 6)}...${cast.userAddress.slice(-4)}` : 'Unknown'}
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
                        <h3 className={styles.historyTitle}>{battle.title}</h3>
                        <span className={styles.historyDate}>
                          {new Date(battle.createdAt).toLocaleDateString()}
                        </span>
                        <div className={styles.historyStats}>
                          <span>{battle.participants} participants</span>
                          <span>{battle.casts} arguments</span>
                        </div>
                        {battle.winner ? (
                          <div className={styles.historyWinner}>
                            <div className={styles.winnerLabel}>🏆 Winner:</div>
                            <div className={styles.winnerInfo}>
                              <span className={styles.winnerAddress}>
                                {battle.winner?.address?.slice(0, 6)}...{battle.winner?.address?.slice(-4)}
                              </span>
                              <span className={styles.winnerPoints}>
                                +{battle.winner.pointsAwarded} points
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.historyWinner}>
                            <div className={styles.winnerLabel}>🏆 Winner:</div>
                            <div className={styles.winnerInfo}>
                              <span className={styles.winnerAddress}>
                                No Winner
                              </span>
                              <span className={styles.winnerPoints}>
                                No participants
                              </span>
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
                    ))
                  ) : (
                    <div className={styles.loading}>Loading battle history...</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className={styles.tabContent}>
                <div className={styles.leaderboardHeader}>
                  <h3>🏆 Top Players</h3>
                  <p className={styles.leaderboardSubtitle}>Ranked by total points earned</p>
                </div>
                <div className={styles.leaderboardList}>
                  {leaderboard.length > 0 ? (
                    leaderboard.map((player, index) => (
                      <div key={player.address} className={`${styles.leaderboardItem} ${index < 3 ? styles.topThree : ''}`}>
                        <div className={styles.leaderboardRank}>
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index > 2 && `#${player.rank}`}
                        </div>
                        <div className={styles.leaderboardInfo}>
                          <div className={styles.leaderboardAddress}>
                            {player.address?.slice(0, 6)}...{player.address?.slice(-4)}
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
                    ))
                  ) : (
                    <div className={styles.loading}>Loading leaderboard...</div>
                  )}
                </div>
              </div>
            )}

            {baseAccountUser ? (
              <div className={styles.quickActions}>
                {!battleJoined ? (
                  <button 
                    className={styles.joinBtn}
                    onClick={joinBattle}
                  >
                    🎯 Join Debate
                  </button>
                ) : !hasSubmittedCast ? (
                  <div className={styles.submitForm}>
                    <div className={styles.sideToggle}>
                      <button 
                        className={`${styles.sideBtn} ${castSide === 'SUPPORT' ? styles.active : ''}`}
                        onClick={() => setCastSide('SUPPORT')}
                      >
                        ✅ Support
                      </button>
                      <button 
                        className={`${styles.sideBtn} ${castSide === 'OPPOSE' ? styles.active : ''}`}
                        onClick={() => setCastSide('OPPOSE')}
                      >
                        ❌ Oppose
                      </button>
                    </div>
                    <textarea
                      className={styles.argumentInput}
                      placeholder="Your argument... (140 chars max)"
                      value={castContent}
                      onChange={(e) => setCastContent(e.target.value)}
                      rows={3}
                      maxLength={140}
                    />
                    <div className={styles.charCounter}>
                      {castContent.length}/140 characters
                    </div>
                    <button
                      onClick={submitCast}
                      disabled={submittingCast || castContent.trim().length < 10 || castContent.trim().length > 140}
                      className={styles.submitBtn}
                    >
                      {submittingCast ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className={styles.quickActions}>
                <p className={styles.signInPrompt}>Sign in with Base Account to participate in this debate!</p>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.battleCard}>
            <div className={styles.battleHeader}>
              <h2 className={styles.topicTitle}>No active battle</h2>
              <p className={styles.topicDescription}>
                There's currently no active debate. Check back soon for the next battle!
              </p>
            </div>
          </div>
        )}
          </main>
        </section>
      )}
    </div>
  );
}
