"use client";
import { useState, useEffect, useCallback } from "react";
import { sdk } from '@farcaster/miniapp-sdk';
import UnifiedAuth from '../components/UnifiedAuth';
import UnifiedPaymentButton from '../components/UnifiedPaymentButton';
import LikeButton from '../components/LikeButton';
import { useAccount as useWagmiAccount, useDisconnect } from 'wagmi';
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

// Utility function for consistent time formatting
const formatTimeForDisplay = (utcTimestamp: string): string => {
  // Convert UTC timestamp to local time for user display
  return new Date(utcTimestamp).toLocaleDateString();
};

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
  user?: {
    address: string;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
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
  const [baseAccountUser, setBaseAccountUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBattle, setCurrentBattle] = useState<Battle | null>(null);
  const [battleLoading, setBattleLoading] = useState(false);
  
  // Tab and UI state
  const [activeTab, setActiveTab] = useState<'debate' | 'arguments' | 'history' | 'leaderboard'>('debate');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [battleEndTime, setBattleEndTime] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  
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
  const [submittingCast, setSubmittingCast] = useState(false);
  const [castContent, setCastContent] = useState('');
  // Use wagmi account hook
  const { address, isConnected } = useWagmiAccount();
  const { disconnect } = useDisconnect();
  
  // Form interaction state
  const [showForm, setShowForm] = useState(false);
  const [selectedSide, setSelectedSide] = useState<'SUPPORT' | 'OPPOSE' | null>(null);
  
  // Card interaction state
  const [hoveredCard, setHoveredCard] = useState<'SUPPORT' | 'OPPOSE' | null>(null);
  
  // Payment state
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [paymentTransactionId, setPaymentTransactionId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Card interaction handlers
  const handleCardHover = (side: 'SUPPORT' | 'OPPOSE' | null) => {
    setHoveredCard(side);
  };

  // Handle side selection
  const handleSideSelection = (side: 'SUPPORT' | 'OPPOSE') => {
    console.log('🎯 Side selection clicked:', side);
    console.log('🎯 Current state - hasSubmittedCast:', hasSubmittedCast);
    console.log('🎯 Current state - showForm:', showForm);
    console.log('🎯 Current state - baseAccountUser:', baseAccountUser?.address);
    
    setSelectedSide(side);
    setCastSide(side);
    setShowForm(true);
    
    console.log('🎯 After setting - showForm should be true');
  };
  
  // Handle back to side selection
  const handleBackToSelection = () => {
    setShowForm(false);
    setSelectedSide(null);
    setCastContent(''); // Clear content when going back
    setPaymentStatus('idle');
    setPaymentTransactionId(null);
    setPaymentError(null);
  };
  
  // SSE and polling state
  const [isMobile, setIsMobile] = useState(false);
  const [sseConnection, setSseConnection] = useState<EventSource | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Debug: Log when hasSubmittedCast changes
  useEffect(() => {
    console.log('🔄 hasSubmittedCast state changed:', hasSubmittedCast);
  }, [hasSubmittedCast]);

  // Format time in HH:MM:SS format (retro digital style)
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Authentication is now handled by UnifiedAuth component

  // Countdown timer effect - updates every second locally, syncs with server every 5 seconds
  useEffect(() => {
    if (!battleEndTime) return;

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((battleEndTime - now) / 1000));
      setTimeRemaining(remaining);
    };

    // Update immediately
    updateCountdown();

    // Set up interval to update every second for smooth countdown
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
            
            // Check if user has already submitted a cast for this battle FIRST
            let userHasSubmitted = false;
            if (baseAccountUser && data.battle.casts) {
              const userAddress = baseAccountUser?.address;
              console.log('🔍 Checking if user has submitted cast:');
              console.log('  - User address:', userAddress);
              console.log('  - Battle casts:', data.battle.casts);
              
              userHasSubmitted = data.battle.casts.some((cast: any) => {
                const castAddress = cast.user?.address?.toLowerCase();
                const userAddr = userAddress?.toLowerCase();
                const hasSubmitted = castAddress === userAddr;
                console.log(`  - Cast address: ${castAddress}, User address: ${userAddr}, Match: ${hasSubmitted}`);
                return hasSubmitted;
              });
              
              console.log('  - User has submitted:', userHasSubmitted);
            }
            
            // Reset payment and submission states for new battle
            // Only reset hasSubmittedCast if we're not in the middle of a submission
            // AND if the user hasn't already submitted
            if (!submittingCast && !userHasSubmitted) {
              setHasSubmittedCast(false);
            } else if (userHasSubmitted) {
              setHasSubmittedCast(true);
            }
            setPaymentStatus('idle');
            setPaymentError(null);
            setPaymentTransactionId(null);
            setCastContent('');
            setError(null);
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
      const response = await fetch('/api/battle/current');
      const data = await response.json();

      if (!data || !data.success) return;

      // Normalize casts shape
      const castsList: Cast[] = Array.isArray(data.casts)
        ? data.casts
        : (Array.isArray(data.battle?.casts) ? data.battle.casts : []);

      setCasts(castsList);

      // Calculate sentiment data
      const support = castsList.filter((cast: Cast) => cast.side === 'SUPPORT').length;
      const oppose = castsList.filter((cast: Cast) => cast.side === 'OPPOSE').length;
      const total = support + oppose;

      if (total > 0) {
        const sentiment = {
          support,
          oppose,
          supportPercent: Math.round((support / total) * 100),
          opposePercent: Math.round((oppose / total) * 100)
        };

        setSentimentData(sentiment);

        const historyEntry = { timestamp: Date.now(), ...sentiment } as any;
        setSentimentHistory(prev => {
          const newHistory = [...prev, historyEntry];
          return newHistory.slice(-20);
        });
      }

      // Check if user has submitted and is a participant
      if (baseAccountUser) {
        const userAddress = baseAccountUser?.address;
        const userCast = castsList.find((cast: Cast) => 
          cast.user?.address && userAddress && 
          cast.user.address.toLowerCase() === userAddress.toLowerCase()
        );
        setHasSubmittedCast(!!userCast);
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

  // Submit cast after payment is completed
  const submitCastAfterPayment = async () => {
    const userAddress = baseAccountUser?.address;
    if (!userAddress || !castContent.trim()) return;

    try {
      setSubmittingCast(true);
      
      // Submit the cast without transaction ID (payment already handled by UnifiedPaymentButton)
      const response = await fetch('/api/battle/submit-cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: userAddress,
          content: castContent.trim(),
          side: castSide,
          transactionId: null // Payment was already processed
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Cast submitted successfully');
        setHasSubmittedCast(true);
        setCastContent('');
        setSubmittingCast(false);
        
        // Update points and show animation
        if (data.points !== undefined) {
          setUserPoints(data.points);
          setPointsAnimation(true);
          setTimeout(() => setPointsAnimation(false), 2000);
        }
        
        // Refresh casts to show the new submission
        fetchCasts();
      } else {
        throw new Error(data.error || 'Failed to submit cast');
      }
    } catch (error) {
      console.error('❌ Failed to submit cast:', error);
      setSubmittingCast(false);
      setError(error instanceof Error ? error.message : 'Failed to submit cast');
    }
  };

  // Submit cast with Base Pay SDK integration
  const submitCast = async () => {
    const userAddress = baseAccountUser?.address;
    if (!userAddress || !castContent.trim()) return;

    let castSubmitted = false; // Flag to track if cast was submitted successfully

    try {
      setSubmittingCast(true);
      
      // First, check if payment is required by trying to submit without payment
      let response = await fetch('/api/battle/submit-cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: userAddress,
          content: castContent.trim(),
          side: castSide,
          transactionId: null // No payment initially
        })
      });
      
      let data = await response.json();
      
      // If payment is required, process payment first using Base Pay SDK
      if (data.requiresPayment && response.status === 402) {
        console.log('💰 Payment required, processing Base Pay...');
        setPaymentStatus('processing');
        setPaymentError(null);
        
        try {
          // Import Base Pay SDK dynamically to avoid SSR issues
          const { pay, getPaymentStatus } = await import('@base-org/account');
          
          // Get contract address from environment
          const contractAddress = process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS;
          if (!contractAddress) {
            throw new Error('Contract address not configured');
          }
          
          // Determine if we're on testnet
          const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || 
                           process.env.NODE_ENV === 'development';
          
          console.log('🔧 Base Pay Configuration:');
          console.log(`   Amount: 1.00 USDC`);
          console.log(`   To: ${contractAddress}`);
          console.log(`   Testnet: ${isTestnet}`);
          
          // Trigger Base Pay - this will show the wallet popup
          const payment = await pay({
            amount: '1.00', // 1 USDC
            to: contractAddress as `0x${string}`,
            testnet: isTestnet
          });
          
          console.log('✅ Base Pay initiated:', payment.id);
          
          // Poll for payment status until completed
          let paymentCompleted = false;
          let attempts = 0;
          const maxAttempts = 30; // 30 attempts = 30 seconds max
          
          while (!paymentCompleted && attempts < maxAttempts) {
            attempts++;
            console.log(`🔍 Checking payment status (attempt ${attempts}/${maxAttempts})...`);
            
            const { status } = await getPaymentStatus({
              id: payment.id,
              testnet: isTestnet // Must match the testnet setting from pay()
            });
            
            console.log(`📊 Payment status: ${status}`);
            
            if (status === 'completed') {
              paymentCompleted = true;
              console.log('🎉 Base Pay payment settled:', payment.id);
              setPaymentTransactionId(payment.id);
              setPaymentStatus('completed');
              
              // Automatically submit the cast with the payment transaction ID
              console.log('📝 Auto-submitting argument after successful payment...');
              response = await fetch('/api/battle/submit-cast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userAddress: userAddress,
                  content: castContent.trim(),
                  side: castSide,
                  transactionId: payment.id
                })
              });
              
              data = await response.json();
              
              // If cast submission successful, mark as submitted
              if (data.success) {
                console.log('✅ Argument submitted successfully after payment');
                
                // Immediately update all relevant states
                setHasSubmittedCast(true);
                setCastContent('');
                setSubmittingCast(false);
                castSubmitted = true; // Mark that cast was submitted
                
                console.log('🔄 Form state updated - hasSubmittedCast: true, castContent cleared');
                
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
                // Handle cast submission error
                console.error('❌ Failed to submit argument after payment:', data.error);
                setError(data.error || 'Failed to submit argument after payment');
              }
            } else if (status === 'failed' || status === 'cancelled') {
              setPaymentError(`Payment ${status}`);
              setPaymentStatus('failed');
              console.error(`❌ Base Pay ${status}:`, payment.id);
              return; // Stop here if payment failed
            } else {
              // Status is 'pending' or other - wait and try again
              console.log(`⏳ Payment still ${status}, waiting 1 second...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            }
          }
          
          if (!paymentCompleted) {
            setPaymentError('Payment timeout - please try again');
            setPaymentStatus('failed');
            console.error('❌ Base Pay timeout after 30 seconds');
            return;
          }
        } catch (paymentError) {
          const errorMessage = paymentError instanceof Error ? paymentError.message : 'Base Pay failed';
          setPaymentError(errorMessage);
          setPaymentStatus('failed');
          console.error('❌ Base Pay error:', errorMessage);
          return; // Stop here if payment failed
        }
      }
      
      // Process the final response (only if not already processed in payment block)
      if (!paymentStatus || paymentStatus !== 'completed') {
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
          // Check if user has already submitted
          if (data.alreadySubmitted) {
            setHasSubmittedCast(true);
            setError('You have already submitted an argument for this debate.');
      } else {
        setError(data.error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to submit cast:', error);
      setError('Failed to submit cast. Please try again.');
    } finally {
      // Only stop loading if cast wasn't already submitted successfully
      if (!castSubmitted) {
        setSubmittingCast(false);
      }
    }
  };

  // Simple Farcaster Mini App ready() call
  useEffect(() => {
    const callReady = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        if (inMiniApp) {
          console.log('🎯 Calling sdk.actions.ready() from main app');
          await sdk.actions.ready();
          console.log('✅ Farcaster Mini App ready() called from main app');
        }
      } catch (error) {
        console.log('ℹ️ Not in Farcaster Mini App or ready() failed:', error);
      }
    };

    callReady();
  }, []);

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
    const userAddress = baseAccountUser?.address;
    if (userAddress) {
      fetchUserPoints(userAddress);
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
              await fetchUserPoints(getUserAddress(baseAccountUser)!);
            }
            // Sync battle timing on mobile every 30 seconds
            if (currentBattle?.endTime) {
              const serverEndTime = new Date(currentBattle.endTime).getTime();
              setBattleEndTime(serverEndTime);
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
          fetchUserPoints(baseAccountUser?.address!);
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
                  // Sync with server time every 5 seconds to prevent drift
                  if (data.data.endTime) {
                    const serverEndTime = new Date(data.data.endTime).getTime();
                    setBattleEndTime(serverEndTime);
                  }
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
                await fetchUserPoints(baseAccountUser?.address!);
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
      console.log('🔐 Manual logout triggered');
      
      // Disconnect the wallet first
      if (isConnected) {
        console.log('🔌 Disconnecting wallet...');
        disconnect();
      }
      
      // Clear all user-related state
      setIsAuthenticated(false);
      setBaseAccountUser(null);
      setActiveTab('debate');
      
      // Clear user-specific data
      setHasSubmittedCast(false);
      setUserPoints(0);
      setCastContent('');
      setSelectedSide(null);
      setShowForm(false);
      setPaymentStatus('idle');
      setPaymentError(null);
      setPaymentTransactionId(null);
      setSubmittingCast(false);
      
      console.log('✅ Signed out successfully - wallet disconnected and all state cleared');
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
                  <UnifiedAuth
                    onAuthSuccess={(user) => {
                      if (user) {
                        console.log('🔐 Auth success callback - user:', user.address);
                        setBaseAccountUser(user);
                        setIsAuthenticated(true);
                        setActiveTab('debate');
                        console.log('✅ Unified authentication successful');
                        
                        // Fetch user points immediately after authentication
                        fetchUserPoints(user.address);
                      } else {
                        // User signed out - clear all state
                        console.log('🔐 User signed out - clearing all state');
                        setBaseAccountUser(null);
                        setIsAuthenticated(false);
                        setActiveTab('debate');
                        
                        // Clear all user-specific data
                        setHasSubmittedCast(false);
                        setUserPoints(0);
                        setCastContent('');
                        setSelectedSide(null);
                        setShowForm(false);
                        setPaymentStatus('idle');
                        setPaymentError(null);
                        setPaymentTransactionId(null);
                        setSubmittingCast(false);
                        
                        console.log('✅ Unified sign out successful - all state cleared');
                      }
                    }}
                    onAuthError={(error) => {
                      console.error('❌ Unified authentication error:', error);
                      // Error is now handled within the UnifiedAuth component
                    }}
                  />
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
                      <span>{baseAccountUser?.address?.slice(0, 6)}...{baseAccountUser?.address?.slice(-4)}</span>
                    </div>
                  </span>
                  <span className={styles.userPoints}>
                    {userPoints} pts
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
                    <h3 className={styles.helpSectionTitle}>💰 Prize Pool</h3>
                    <ul className={styles.helpList}>
                      <li><strong>Entry Fee:</strong> 1 USDC per argument submission</li>
                      <li><strong>Winner Takes:</strong> 80% of the total prize pool</li>
                      <li><strong>Platform Fee:</strong> 20% goes to platform maintenance</li>
                      <li><strong>Automatic Payout:</strong> Winners receive USDC directly to their wallet</li>
                    </ul>
          </div>

                  <div className={styles.helpSection}>
                    <h3 className={styles.helpSectionTitle}>🔗 Base Sepolia Network</h3>
                    <ul className={styles.helpList}>
                      <li><strong>Network:</strong> Deployed on Base Sepolia testnet</li>
                      <li><strong>Contract:</strong> Smart contract handles all payments and payouts</li>
                      <li><strong>Oracle:</strong> AI-powered oracle determines debate winners</li>
                      <li><strong>Security:</strong> EIP-712 signatures ensure secure transactions</li>
                    </ul>
        </div>

                  <div className={styles.helpSection}>
                    <h3 className={styles.helpSectionTitle}>⚡ Features</h3>
                    <ul className={styles.helpList}>
                      <li><strong>Real-time Updates:</strong> Live sentiment tracking and participant count</li>
                      <li><strong>Mobile Optimized:</strong> Responsive design for all devices</li>
                      <li><strong>Like System:</strong> Like/unlike arguments to influence winner selection</li>
                      <li><strong>Leaderboard:</strong> Track your points and ranking</li>
                    </ul>
                  </div>

                  <div className={styles.helpSection}>
                    <h3 className={styles.helpSectionTitle}>🚀 Getting Started</h3>
                    <ol className={styles.helpList}>
                      <li>Connect your Base Account wallet</li>
                      <li>Ensure you have USDC on Base Sepolia</li>
                      <li>Read the current debate topic and description</li>
                      <li>Choose Support or Oppose based on your view</li>
                      <li>Submit your argument and pay the entry fee</li>
                      <li>Wait for the debate to end and winner announcement</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debug Info - Remove in production */}
          <div style={{ 
            position: 'fixed', 
            top: '10px', 
            right: '10px', 
            background: 'rgba(0,0,0,0.8)', 
            color: 'white', 
            padding: '10px', 
            fontSize: '12px',
            zIndex: 9999,
            borderRadius: '5px'
          }}>
            <div>Auth: {baseAccountUser ? '✅' : '❌'}</div>
            <div>Address: {baseAccountUser?.address?.slice(0, 8)}...</div>
            <div>ShowForm: {showForm ? '✅' : '❌'}</div>
            <div>HasSubmitted: {hasSubmittedCast ? '✅' : '❌'}</div>
            <div>SelectedSide: {selectedSide || 'None'}</div>
            <button 
              onClick={() => {
                console.log('🔧 Debug button clicked');
                console.log('Current state:', { 
                  baseAccountUser: baseAccountUser?.address, 
                  showForm, 
                  hasSubmittedCast, 
                  selectedSide 
                });
                setShowForm(true);
                setSelectedSide('SUPPORT');
              }}
              style={{ 
                background: '#007bff', 
                color: 'white', 
                border: 'none', 
                padding: '5px', 
                borderRadius: '3px',
                cursor: 'pointer',
                marginTop: '5px'
              }}
            >
              Force Show Form
            </button>
          </div>

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
                <a 
                  href={currentBattle.sourceUrl || currentBattle.source} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.topicSource}
                >
                  {currentBattle.source}
                </a>
                <span className={styles.participantsCount}>
                  👥 {currentBattle.participants?.length || 0} participants
                </span>
                {timeRemaining !== null && (
                  <span className={styles.timer}>
                    ⏰ {formatTime(timeRemaining)}
                  </span>
                )}
              </div>

              {currentBattle.imageUrl && (
                <img 
                  src={currentBattle.imageUrl} 
                  alt={currentBattle.title}
                  className={styles.topicImage}
                />
              )}
              
              <h2 className={styles.topicTitle}>{currentBattle.title}</h2>
              <p className={styles.topicDescription}>{currentBattle.description}</p>
            </div>

            {/* Market Sentiment Graph - Always Visible */}
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
                {console.log('🔍 Rendering debate tab - showForm:', showForm, 'hasSubmittedCast:', hasSubmittedCast)}
                {!showForm ? (
              <div className={styles.debatePoints}>
                    {/* Cards container */}
                    <div className={styles.debateCardsContainer}>
                      {/* Oppose Card */}
                      <div 
                        className={`${styles.debateCard} ${styles.oppose} ${hoveredCard === 'OPPOSE' ? styles.swipingLeft : ''}`}
                        onClick={() => handleSideSelection('OPPOSE')}
                        onMouseEnter={() => handleCardHover('OPPOSE')}
                        onMouseLeave={() => handleCardHover(null)}
                      >
                        <div className={styles.debateCardContent}>
                          <div className={styles.debateCardHeader}>
                            <h3 className={styles.debateCardTitle}>❌ Oppose</h3>
                            <p className={styles.debateCardSubtitle}>Tap to oppose this argument</p>
                          </div>
                          <div className={styles.debateCardPoints}>
                            <ul>
                              {currentBattle.debatePoints.Oppose.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
                        </div>
                      </div>
                      
                      {/* Support Card */}
                      <div 
                        className={`${styles.debateCard} ${styles.support} ${hoveredCard === 'SUPPORT' ? styles.swipingRight : ''}`}
                        onClick={() => handleSideSelection('SUPPORT')}
                        onMouseEnter={() => handleCardHover('SUPPORT')}
                        onMouseLeave={() => handleCardHover(null)}
                      >
                        <div className={styles.debateCardContent}>
                          <div className={styles.debateCardHeader}>
                            <h3 className={styles.debateCardTitle}>✅ Support</h3>
                            <p className={styles.debateCardSubtitle}>Tap to support this argument</p>
                          </div>
                          <div className={styles.debateCardPoints}>
                            <ul>
                              {currentBattle.debatePoints.Support.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.formContainer}>
                    <div className={styles.formHeader}>
                      <button 
                        className={styles.backButton}
                        onClick={handleBackToSelection}
                        aria-label="Back to side selection"
                      >
                        ← Back
                      </button>
                      <h3 className={styles.formTitle}>
                        Submit Your Argument
                      </h3>
                    </div>
                    
                    {baseAccountUser ? (
                      <div className={styles.submitForm}>
                        {hasSubmittedCast ? (
                          <div className={styles.alreadySubmitted}>
                            <div className={styles.submittedIcon}>✅</div>
                            <h3 className={styles.submittedTitle}>Argument Submitted</h3>
                            <p className={styles.submittedMessage}>
                              Thank you for participating in this debate! Your argument has been submitted successfully.
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Argument Submission Form */}
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
                            
                            {/* Single Payment Button with Dynamic States */}
                            <UnifiedPaymentButton
                              onClick={submitCastAfterPayment}
                              disabled={submittingCast || castContent.trim().length < 10 || castContent.trim().length > 140}
                              loading={submittingCast}
                              colorScheme="light"
                              amount="1.00"
                              recipientAddress="0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271"
                            >
                              {submittingCast 
                                ? (paymentStatus === 'processing' ? 'Processing Payment...' : 'Submitting...')
                                : 'Pay & Submit'
                              }
                            </UnifiedPaymentButton>
                            
                            {/* Single Status Display - Only for errors */}
                            {paymentStatus === 'failed' && (
                              <div className={styles.statusDisplay}>
                                <div className={styles.statusError}>
                                  <span className={styles.errorIcon}>❌</span>
                                  <p className={styles.errorText}>
                                    {paymentError || 'Payment failed. Please try again.'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className={styles.signInPrompt}>
                        Sign in with Base Account to participate in this debate!
                      </div>
                    )}
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
                            {cast.user?.address ? `${cast.user.address.slice(0, 6)}...${cast.user.address.slice(-4)}` : 'Unknown'}
                          </span>
                        </div>
                        <div className={styles.argumentContent}>{cast.content}</div>
                        <div className={styles.argumentActions}>
                          <LikeButton
                            castId={cast.id}
                            userAddress={baseAccountUser?.address}
                            onLikeChange={(likeCount, userLiked) => {
                              console.log(`Cast ${cast.id} like count: ${likeCount}, user liked: ${userLiked}`);
                            }}
                          />
                        </div>
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
                          {/* Convert UTC timestamp to local time for display */}
                          {formatTimeForDisplay(battle.createdAt)}
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
