"use client";
import { useState, useEffect, useCallback } from "react";
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { createBaseAccountSDK } from '@base-org/account';
import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import sdk from '@farcaster/frame-sdk';
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
  sourceUrl?: string;
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

interface User {
  address: string;
  username?: string;
}

interface BaseSDK {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getAccount: () => Promise<User | null>;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [sdk, setSdk] = useState<BaseSDK | null>(null);
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
  const [activeTab, setActiveTab] = useState<'debate' | 'arguments' | 'history' | 'leaderboard'>('debate');
  const [hasSubmittedCast, setHasSubmittedCast] = useState(false);
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
  const [battleTransition, setBattleTransition] = useState<{
    isTransitioning: boolean;
    message: string;
    newBattle?: DebateTopic;
  }>({ isTransitioning: false, message: '' });
  const [userPoints, setUserPoints] = useState<number>(0);
  const [pointsAnimation, setPointsAnimation] = useState(false);
  const [battleStatusMessage, setBattleStatusMessage] = useState<string | null>(null);
  const [battleStatusType, setBattleStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  // Mobile-specific handlers
  const handleHelpPopupClose = () => {
    setShowHelpPopup(false);
  };

  const handleHelpOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleHelpPopupClose();
    }
  };

  // Prevent body scroll when popup is open (mobile optimization)
  // Initialize Farcaster SDK
  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        // Don't call ready() immediately - wait for app to be fully loaded
        console.log('Farcaster SDK detected');
      } catch (error) {
        console.log('Farcaster SDK not available (running outside Farcaster)');
      }
    };
    
    initializeFarcaster();
  }, []);

  // Call ready() after app is fully loaded
  useEffect(() => {
    const callReady = async () => {
      try {
        // Wait for app to be fully initialized before calling ready()
        await sdk.actions.ready();
        console.log('Farcaster app is ready');
      } catch (error) {
        // SDK not available or already called
        console.log('Farcaster ready() not needed');
      }
    };

    // Call ready() after a short delay to ensure app is loaded
    const timer = setTimeout(callReady, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showHelpPopup) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [showHelpPopup]);

  useEffect(() => {
    const initApp = async () => {
      try {
        await Promise.all([
          fetchCurrentBattle(),
          fetchBattleHistory()
        ]);
      } catch (error) {
        console.error('App initialization error:', error);
      }
    };
    initApp();
    const cleanupBattleSSE = setupBattleStateSSE();
    
    // Initialize Base Account SDK on client side only
    if (typeof window !== 'undefined') {
      try {
        // Suppress analytics-related console errors
        const originalConsoleError = console.error;
        console.error = (...args) => {
          const message = args.join(' ');
          if (message.includes('Analytics SDK') || message.includes('AnalyticsSDKApiError')) {
            // Suppress analytics errors
            return;
          }
          originalConsoleError.apply(console, args);
        };

        // Check if ethereum provider is available
        if (!window.ethereum) {
          console.log('No Ethereum provider found. Wallet connection will not be available.');
          // Continue without wallet - app can still be used for viewing battles
          return;
        }

        const baseSDK = createBaseAccountSDK({
          appName: 'Agentic AI NewsCast Debate on Base (Beta)',
          appUrl: window.location.origin,
          chain: base,
          client: createWalletClient({
            chain: base,
            transport: custom(window.ethereum)
          })
        });
        setSdk(baseSDK);
        
        // Restore original console.error after SDK initialization
        console.error = originalConsoleError;
        
        // Check for existing authentication
        const savedUser = localStorage.getItem('newscast-battle-user');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          // Fetch user points when they're authenticated
          fetchUserPoints(userData.address);
        }
      } catch (error) {
        console.error('Failed to initialize Base Account SDK:', error);
        setError('Failed to initialize wallet connection');
      }
    }

    // Cleanup function
    return () => {
      if (cleanupBattleSSE) {
        cleanupBattleSSE();
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
      
      // Show status message when timer reaches 0
      if (remaining === 0 && !battleStatusMessage) {
        setBattleStatusMessage('⏰ Battle ended! Judging in progress...');
        setBattleStatusType('info');
      }
      
      // Clear status message when timer is running (new battle started)
      if (remaining > 0 && battleStatusMessage) {
        setBattleStatusMessage(null);
        setBattleStatusType('info'); // Reset to default type
      }
    };

    // Update immediately
    updateCountdown();

    // Set up interval to update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [battleEndTime, battleStatusMessage]);


  // Pulse animation effect for chart end points
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setPulseAnimation(prev => prev + 1);
    }, 1000);

    return () => clearInterval(pulseInterval);
  }, []);

  const setupBattleStateSSE = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const eventSource = new EventSource('/api/battle/state-stream');
      
      eventSource.onopen = () => {
        console.log('Battle state SSE connection opened');
        setConnectionStatus('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'CONNECTION_ESTABLISHED':
              console.log('Battle state SSE connected:', data.connectionId);
              break;
              
            case 'BATTLE_ENDED':
              console.log('Battle ended:', data.data);
              setBattleStatusMessage('🏁 Debate completed! Judging in progress...');
              setBattleStatusType('info');
              setBattleJoined(false); // Reset join state for next battle
              setHasSubmittedCast(false); // Reset cast submission state
              setError(null); // Clear any errors
              setBattleTransition({
                isTransitioning: true,
                message: 'Debate ending...'
              });
              break;
              
            case 'BATTLE_STARTED':
              console.log('New battle started:', data.data);
              setBattleStatusMessage(null); // Clear status message
              setBattleStatusType('info'); // Reset to default type
              setBattleJoined(false); // Reset join state for new battle
              setHasSubmittedCast(false); // Reset cast submission state
              setError(null); // Clear any previous errors
              setBattleTransition({
                isTransitioning: true,
                message: 'New debate starting...',
                newBattle: data.data
              });
              
              // Update the battle data after a short delay for smooth transition
              setTimeout(async () => {
                // Fetch complete battle data to ensure UI is fully updated
                await fetchCurrentBattle();
                setBattleTransition({ isTransitioning: false, message: '' });
              }, 1000);
              break;
              
            case 'BATTLE_TRANSITION':
              console.log('Battle transition:', data.data);
              break;
              
            case 'STATUS_UPDATE':
              console.log('Status update:', data.data);
              setBattleStatusMessage(data.data.message);
              setBattleStatusType(data.data.type || 'info');
              break;
              
            case 'LEADERBOARD_UPDATE':
              console.log('📡 Received leaderboard update:', data.data);
              // Refresh leaderboard when winner is selected
              if (activeTab === 'leaderboard') {
                fetchLeaderboard();
              }
              break;
              
            case 'TIMER_UPDATE':
              console.log('Timer update from server:', data.data.timeRemaining, 'seconds remaining');
              // Update battle end time if it changed (new battle)
              if (data.data.endTime && data.data.endTime !== battleEndTime) {
                setBattleEndTime(new Date(data.data.endTime).getTime());
              }
              break;
              
            case 'SENTIMENT_UPDATE':
              console.log('Sentiment update received:', data.data);
              // Update sentiment data
              setSentimentData(data.data.sentiment);
              
              // Update sentiment history for chart
              const historyEntry = {
                timestamp: data.data.timestamp,
                ...data.data.sentiment
              };
              
              setSentimentHistory(prev => {
                const newHistory = [...prev, historyEntry];
                return newHistory.slice(-20); // Keep last 20 data points
              });

              // Update casts if provided
              if (data.data.casts) {
                setCasts(data.data.casts);
              }

              // Update user submission status if provided
              if (data.data.userSubmissionStatus !== undefined && user) {
                setHasSubmittedCast(data.data.userSubmissionStatus);
              }
              break;
              
            case 'HEARTBEAT':
              // Keep connection alive
              break;
              
            default:
              console.log('Unknown battle state event:', data);
          }
        } catch (error) {
          console.error('Error parsing battle state SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Battle state SSE connection error:', error);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (eventSource.readyState === EventSource.CLOSED) {
            console.log('Attempting to reconnect battle state SSE...');
            setupBattleStateSSE();
          }
        }, 5000);
      };

      // Return cleanup function
      return () => {
        eventSource.close();
        setConnectionStatus('disconnected');
      };
    } catch (error) {
      console.error('Failed to setup battle state SSE connection:', error);
      setConnectionStatus('disconnected');
      return () => {}; // Return empty cleanup function
    }
  }, []);

  const fetchCurrentBattle = useCallback(async () => {
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
        setError(data.error || 'No active debate available');
      }
    } catch (error) {
      console.error('Error fetching battle:', error);
        setError('Failed to fetch debate data');
    } finally {
      setLoading(false);
    }
  }, []);

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
        
        // Check if user has submitted
        if (user) {
          const userCast = data.casts.find((cast: Cast) => 
            cast.userAddress.toLowerCase() === user.address.toLowerCase()
          );
          setHasSubmittedCast(!!userCast);
        } else {
          // Check localStorage for user data if state is not ready
          const savedUser = localStorage.getItem('newscast-battle-user');
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
  }, []);

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

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch('/api/user/leaderboard?limit=10');
      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  }, []);

  const fetchUserPoints = async (address: string) => {
    try {
      const response = await fetch(`/api/user/points?address=${address}`);
      const data = await response.json();
      
      if (data.success) {
        setUserPoints(data.points);
      }
    } catch (error) {
      console.error('Failed to fetch user points:', error);
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
      setError('Failed to join debate');
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
        
        // Update points and show animation
        if (data.points !== undefined) {
          setUserPoints(data.points);
          setPointsAnimation(true);
          setTimeout(() => setPointsAnimation(false), 2000);
        }
        
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
      const message = `Join Agentic AI NewsCast Debate on Base (Beta) at ${Date.now()}`;
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
      localStorage.setItem('newscast-battle-user', JSON.stringify(userData));
      
      // Fetch user points
      await fetchUserPoints(account);
      
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
    localStorage.removeItem('newscast-battle-user');
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
    labels: sentimentHistory.length > 0 ? sentimentHistory.map((_, index) => {
      if (sentimentHistory.length <= 1) return 'Now';
      const timeDiff = Date.now() - sentimentHistory[index].timestamp;
      const minutes = Math.floor(timeDiff / 60000);
      return minutes === 0 ? 'Now' : `${minutes}m ago`;
    }) : ['Now'],
    datasets: [
      {
        label: 'Support %',
        data: sentimentHistory.length > 0 ? sentimentHistory.map(point => point.supportPercent) : [0],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: sentimentHistory.length > 0 ? sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? 6 + Math.sin(pulseAnimation * Math.PI / 2) * 2 : 3
        ) : [0],
        pointHoverRadius: 8,
        pointBackgroundColor: sentimentHistory.length > 0 ? sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? '#10b981' : '#10b981'
        ) : ['#10b981'],
        pointBorderColor: sentimentHistory.length > 0 ? sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? '#ffffff' : '#10b981'
        ) : ['#10b981'],
        pointBorderWidth: sentimentHistory.length > 0 ? sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? 3 : 1
        ) : [1],
      },
      {
        label: 'Oppose %',
        data: sentimentHistory.length > 0 ? sentimentHistory.map(point => point.opposePercent) : [0],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: sentimentHistory.length > 0 ? sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? 6 + Math.sin(pulseAnimation * Math.PI / 2) * 2 : 3
        ) : [0],
        pointHoverRadius: 8,
        pointBackgroundColor: sentimentHistory.length > 0 ? sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? '#ef4444' : '#ef4444'
        ) : ['#ef4444'],
        pointBorderColor: sentimentHistory.length > 0 ? sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? '#ffffff' : '#ef4444'
        ) : ['#ef4444'],
        pointBorderWidth: sentimentHistory.length > 0 ? sentimentHistory.map((_, index) => 
          index === sentimentHistory.length - 1 ? 3 : 1
        ) : [1],
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const
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
          callback: (value: number) => {
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
      {/* Battle Transition Overlay */}
      {battleTransition.isTransitioning && (
        <div className={styles.transitionOverlay}>
          <div className={styles.transitionContent}>
            <div className={styles.transitionSpinner}></div>
            <p className={styles.transitionMessage}>{battleTransition.message}</p>
          </div>
        </div>
      )}
      
      {/* Minimalist Header */}
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
              <button 
                className={styles.helpBtn}
                onClick={() => setShowHelpPopup(true)}
                title="How to play"
                aria-label="Open help popup"
                type="button"
              >
                ?
              </button>
            </div>
          </div>
          {user ? (
            <div className={styles.userCompact}>
              <div className={styles.userInfo}>
                <span className={styles.userAddress}>{user.address.slice(0, 6)}...{user.address.slice(-4)}</span>
                <span className={`${styles.userPoints} ${pointsAnimation ? styles.pointsAnimated : ''}`}>
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
          ) : sdk ? (
            <div className={styles.signInWrapper}>
              <SignInWithBaseButton 
                size="small"
                variant="solid"
                colorScheme="light"
                onClick={handleSignIn}
                className={styles.signInButton}
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
        {/* Hero Section */}
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h2 className={styles.heroTitle}>
              Experience the Future of <span className={styles.aiHighlight}>Agentic AI</span> Debate
            </h2>
          </div>
        </div>

        {error ? (
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
                {battleStatusMessage ? (
                  <span className={`${styles.timer} ${styles.statusMessage} ${styles[battleStatusType]}`}>
                    {battleStatusMessage}
                  </span>
                ) : timeRemaining && timeRemaining > 0 ? (
                  <span className={styles.timer}>{formatTimeRemaining(timeRemaining)}</span>
                ) : (
                  <span className={`${styles.timer} ${styles.statusMessage} ${styles.info}`}>
                    ⏰ Battle ended! Judging in progress...
                  </span>
                )}
              </div>
              <h2 className={styles.topicTitle}>{topic.title}</h2>
              
              {/* Source and Category Info */}
              <div className={styles.topicMeta}>
                <span className={styles.topicCategory}>{topic.category}</span>
                {topic.source && topic.source !== 'System' && (
                  <a 
                    href={topic.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(topic.source)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.topicSource}
                    title={topic.sourceUrl ? 'View original article' : 'Search for source'}
                  >
                    📰 {topic.source}
                    {topic.sourceUrl && <span className={styles.linkIcon}>↗</span>}
                  </a>
                )}
              </div>

              <p className={styles.topicDescription}>{topic.description}</p>

              {/* Debate Points */}
              {topic.debatePoints && (
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
              )}
              </div>

            {/* Quick Actions */}
            <div className={styles.quickActions}>
              {!battleJoined && !hasSubmittedCast && (
                <button 
                  onClick={joinBattle} 
                  className={styles.joinBtn}
                  disabled={!user}
                >
                  {user ? 'Join Debate' : 'Sign in to Join Debate'}
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
                        <h3 className={styles.historyTitle}>{battle.title}</h3>
                        <span className={styles.historyDate}>
                          {new Date(battle.createdAt).toLocaleDateString()}
                        </span>
                        <div className={styles.historyStats}>
                          <span>{battle.participants} participants</span>
                          <span>{battle.casts} arguments</span>
                        </div>
                        {battle.winner && (
                          <div className={styles.historyWinner}>
                            <div className={styles.winnerLabel}>🏆 Winner:</div>
                            <div className={styles.winnerInfo}>
                              <span className={styles.winnerAddress}>
                                {battle.winner.address.slice(0, 6)}...{battle.winner.address.slice(-4)}
                              </span>
                              <span className={styles.winnerPoints}>
                                +{battle.winner.pointsAwarded} points
                              </span>
                            </div>
                          </div>
                        )}
                        {battle.winners.length > 1 && (
                          <div className={styles.historyAllWinners}>
                            <div className={styles.allWinnersLabel}>All winners:</div>
                            {battle.winners.map((winner, index) => (
                              <div key={index} className={styles.winnerItem}>
                                <span className={styles.winnerPosition}>
                                  {winner.position === 1 ? '🥇' : winner.position === 2 ? '🥈' : '🥉'}
                                </span>
                                <span className={styles.winnerAddress}>
                                  {winner.address.slice(0, 6)}...{winner.address.slice(-4)}
                                </span>
                                <span className={styles.winnerPoints}>
                                  +{winner.pointsAwarded} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className={styles.loading}>No previous debates.</div>
                  )}
                </div>
              </div>
            )}

            {/* Leaderboard Tab */}
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
                    ))
                  ) : (
                    <div className={styles.loading}>Loading leaderboard...</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.loading}>No active debate available.</div>
        )}
      </main>

      {/* Help Popup */}
      {showHelpPopup && (
        <div className={styles.helpOverlay} onClick={handleHelpOverlayClick}>
          <div className={styles.helpPopup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.helpHeader}>
              <h2 className={styles.helpTitle}>Agentic AI-Powered NewsCast Debate (Beta)</h2>
              <button 
                className={styles.helpCloseBtn}
                onClick={handleHelpPopupClose}
                aria-label="Close help popup"
              >
                ×
              </button>
            </div>
            
            <div className={styles.helpContent}>
              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>🎯 The Game</h3>
                <p className={styles.helpText}>
                  NewsCast Debate (Beta) is an <strong className={styles.aiHighlight}>Agentic AI-powered</strong> debate platform where you engage in intelligent discussions about trending news topics. 
                  Each battle lasts <strong>4 hours</strong> and features real news articles autonomously curated by our <strong className={styles.aiHighlight}>advanced AI agents</strong>.
                </p>
              </div>

              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>🤖 Agentic AI Features</h3>
                <ul className={styles.helpList}>
                  <li><strong className={styles.aiHighlight}>Intelligent Topic Curation:</strong> Agentic AI autonomously discovers trending news stories and selects the most debate-worthy topics</li>
                  <li><strong className={styles.aiHighlight}>Dynamic Argument Generation:</strong> Advanced AI creates balanced, compelling debate points for both sides in real-time</li>
                  <li><strong className={styles.aiHighlight}>Autonomous Judging System:</strong> Agentic AI evaluates arguments with superhuman objectivity and selects winners based on merit</li>
                  <li><strong className={styles.aiHighlight}>Intelligent Battle Analytics:</strong> AI generates deep insights and summaries of winning strategies</li>
                </ul>
              </div>

              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>🎮 How to Play</h3>
                <ol className={styles.helpSteps}>
                  <li><strong>Join Debate:</strong> Click &quot;Join Debate&quot; to participate</li>
                  <li><strong>Choose Side:</strong> Pick SUPPORT or OPPOSE</li>
                  <li><strong>Write Argument:</strong> Submit your 140-character argument</li>
                  <li><strong>Earn Points:</strong> Get 10 points for participating</li>
                  <li><strong>Win Big:</strong> Winners get 100 bonus points!</li>
                </ol>
              </div>

              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>🏆 Autonomous Judging</h3>
                <p className={styles.helpText}>
                  Our <strong className={styles.aiHighlight}>Agentic AI Judge</strong> operates with superhuman analytical capabilities, 
                  evaluating all arguments for quality, relevance, and persuasive power. It ensures completely fair competition 
                  by analyzing both sides with perfect objectivity, then autonomously selects the most compelling arguments 
                  to determine the winner.
                </p>
              </div>

              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>⚡ Intelligent Automation</h3>
                <p className={styles.helpText}>
                  Experience <strong className={styles.aiHighlight}>autonomous battle management</strong> with live sentiment tracking, 
                  instant winner notifications, and seamless transitions as our <strong className={styles.aiHighlight}>Agentic AI</strong> 
                  automatically generates new battles and manages the entire debate ecosystem.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disabled Overlay for Loading States */}
      {loading && (
        <div className={styles.disabledOverlay}>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
               <div className={styles.loadingText}>Initializing Agentic AI Debate Platform...</div>
               <div className={styles.loadingSubtext}>Activating AI agents and synchronizing debate ecosystem</div>
          </div>
        </div>
      )}
    </div>
  );
}
