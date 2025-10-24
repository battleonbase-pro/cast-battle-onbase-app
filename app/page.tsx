"use client";
import { useState, useEffect, useCallback } from "react";
import { sdk } from '@farcaster/miniapp-sdk';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useEnvironmentDetection } from '../hooks/useEnvironmentDetection';
import UnifiedAuth from '../components/UnifiedAuth';
import AppHeader from '../components/AppHeader';
import BattleCard from '../components/BattleCard';
import SentimentChart from '../components/SentimentChart';
import DebateForm from '../components/DebateForm';
import ArgumentsList from '../components/ArgumentsList';
import BattleHistory from '../components/BattleHistory';
import Leaderboard from '../components/Leaderboard';
import { useAccount as useWagmiAccount, useDisconnect, useConnect } from 'wagmi';
import styles from "./page.module.css";

interface Battle {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  sourceUrl: string;
  imageUrl: string;
  thumbnail: string;
  endTime: string;
  participants: number;
  status: string;
}

interface Cast {
  id: string;
  content: string;
  side: string;
  userAddress: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
}

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

interface SentimentData {
  support: number;
  oppose: number;
  supportPercent: number;
  opposePercent: number;
}

export default function Home() {
  const { context } = useMiniKit();
  const environmentInfo = useEnvironmentDetection();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [baseAccountUser, setBaseAccountUser] = useState<{ address: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccessCastFailed, setPaymentSuccessCastFailed] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [currentBattle, setCurrentBattle] = useState<Battle | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [selectedSide, setSelectedSide] = useState<string | null>(null);
  const [castContent, setCastContent] = useState('');
  const [hasSubmittedCast, setHasSubmittedCast] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [battleHistory, setBattleHistory] = useState<Array<Battle & { winner?: string; insights?: string }>>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [sentimentHistory, setSentimentHistory] = useState<Array<{
    timestamp: number;
    support: number;
    oppose: number;
    supportPercent: number;
    opposePercent: number;
  }>>([]);
  const [activeTab, setActiveTab] = useState<'debate' | 'arguments' | 'history' | 'leaderboard'>('debate');
  const [casts, setCasts] = useState<Cast[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCalledSuccess, setHasCalledSuccess] = useState(false);
  const [submittingCast, setSubmittingCast] = useState(false);

  // Wagmi hooks for external browser payment transactions
  const { isConnected } = useWagmiAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  // Initialize Farcaster SDK for Base App Mini App
  useEffect(() => {
    const initializeFarcasterSDK = async () => {
      try {
        await sdk.actions.ready();
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);
      }
    };

    initializeFarcasterSDK();
  }, []);

  // Fetch user points
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

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch current battle
      const battleResponse = await fetch('/api/battle/current');
      const battleData = await battleResponse.json();
      
      if (battleData.success && battleData.battle) {
        console.log('🔄 Loading initial data - currentBattle:', battleData.battle.id);
        setCurrentBattle(battleData.battle);
        
        // Calculate time remaining
        if (battleData.battle.endTime) {
          const endTime = new Date(battleData.battle.endTime).getTime();
          const now = Date.now();
          const remainingMs = Math.max(0, endTime - now);
          const remainingSeconds = Math.floor(remainingMs / 1000);
          setTimeRemaining(remainingSeconds);
        }
        
        // Check if user has already submitted a cast
        if (baseAccountUser?.address) {
          console.log('🔄 baseAccountUser:', baseAccountUser?.address);
          console.log('🔄 hasSubmittedCast before fetch:', hasSubmittedCast);
          
          const castResponse = await fetch(`/api/battle/casts?address=${baseAccountUser.address}`);
          const castData = await castResponse.json();
          
          if (castData.success && castData.casts && castData.casts.length > 0) {
            setHasSubmittedCast(true);
          }
        }
      }
      
      // Fetch leaderboard
      const leaderboardResponse = await fetch('/api/leaderboard');
      const leaderboardData = await leaderboardResponse.json();
      if (leaderboardData.success) {
        setLeaderboard(leaderboardData.leaderboard);
      }
      
      // Fetch battle history
      const historyResponse = await fetch('/api/battle/history');
      const historyData = await historyResponse.json();
      if (historyData.success) {
        setBattleHistory(historyData.history);
      }
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [baseAccountUser?.address, hasSubmittedCast]);

  // Handle authentication success
  const handleAuthSuccess = useCallback(async (user: { address: string; environment: string; isAuthenticated: boolean } | null) => {
    console.log('🔐 handleAuthSuccess called with user:', user);
    
    if (!user) {
      console.log('❌ handleAuthSuccess: No user provided');
      return;
    }
    
    console.log('🔐 Auth success callback - user:', user.address);
    console.log('🔐 Auth success callback - environment:', user.environment);
    console.log('🔐 Auth success callback - isAuthenticated:', user.isAuthenticated);
    
    console.log('✅ Unified authentication successful - proceeding to debate page');
    
    // Set authentication state
    setIsAuthenticated(true);
    setBaseAccountUser(user);
    
    // Fetch user points
    fetchUserPoints(user.address);
    
    // Connect to wagmi for payment transactions in external browsers
    if (user.environment === 'external' && !isConnected) {
      console.log('🔗 Connecting to wagmi for payment transactions...');
      
      // Enhanced environment detection for connector selection
      const isBaseApp = context?.client?.clientFid === 309857;
      const isFarcaster = context?.client?.clientFid === 9152;
      const isMiniApp = isBaseApp || isFarcaster;
      
      console.log('🔍 Enhanced environment detection:', {
        isBaseApp,
        isFarcaster,
        isMiniApp,
        clientFid: context?.client?.clientFid,
        userFid: context?.user?.fid
      });
      
      // Select appropriate connector based on environment
      let selectedConnector = null;
      
      if (isFarcaster) {
        console.log('🔍 Using Farcaster Mini App connector (enhanced detection)');
        selectedConnector = connectors.find(c => c.id === 'farcasterMiniApp');
      } else if (isBaseApp) {
        console.log('🔍 Using Base Account connector (enhanced detection)');
        selectedConnector = connectors.find(c => c.id === 'baseAccount');
      } else {
        console.log('🔍 Using Coinbase Wallet connector (fallback)');
        selectedConnector = connectors.find(c => c.id === 'coinbaseWallet');
      }
      
      if (selectedConnector) {
        try {
          console.log('🔗 Attempting to connect with connector:', selectedConnector.id);
          await connect({ connector: selectedConnector });
          console.log('✅ Wagmi connection successful');
        } catch (error) {
          console.error('❌ Wagmi connection failed:', error);
        }
      } else {
        console.log('⚠️ No suitable connector found, proceeding without wagmi connection');
      }
    }
    
    // Load initial data
    await loadInitialData();
  }, [isConnected, connect, connectors, context, fetchUserPoints, loadInitialData]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      console.log('🔐 Manual logout triggered');
      
      // Disconnect wagmi wallet if connected
      if (isConnected) {
        console.log('🔌 Disconnecting wallet...');
        disconnect();
      }
      
      // Clear all state
      setIsAuthenticated(false);
      setBaseAccountUser(null);
      setCurrentBattle(null);
      setTimeRemaining(null);
      setSelectedSide(null);
      setCastContent('');
      setHasSubmittedCast(false);
      setPaymentStatus('idle');
      setPaymentError(null);
      setUserPoints(0);
      setLeaderboard([]);
      setBattleHistory([]);
      setSentimentData(null);
      setSentimentHistory([]);
      setCasts([]);
      setIsProcessing(false);
      setHasCalledSuccess(false);
      setSubmittingCast(false);
      setPaymentSuccessCastFailed(false);
      setPaymentCompleted(false);
      
      console.log('✅ Signed out successfully - wallet disconnected and all state cleared');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Check if payment is required
  const checkPaymentRequired = async (): Promise<{ requiresPayment: boolean; paymentDetails?: unknown; paymentRequirements?: unknown }> => {
    try {
      const response = await fetch('/api/battle/submit-cast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: baseAccountUser?.address,
          castContent: castContent.trim(),
          side: selectedSide,
        }),
      });

      if (response.status === 402) {
        const paymentRequiredResponse = await response.json();
        console.log('💰 Payment required (402):', paymentRequiredResponse);
        
        return {
          requiresPayment: true,
          paymentDetails: paymentRequiredResponse,
          paymentRequirements: paymentRequiredResponse
        };
      } else if (response.ok) {
        console.log('✅ No payment required');
        return { requiresPayment: false };
      } else {
        console.log('❌ Unexpected response:', response.status);
        return { requiresPayment: false };
      }
    } catch (error) {
      console.error('Error checking payment requirement:', error);
      return { requiresPayment: false };
    }
  };

  // Submit cast after payment
  const submitCastAfterPayment = async (transactionId?: string) => {
    console.log('🔄 submitCastAfterPayment called');
    console.log('📝 Transaction ID:', transactionId);
    
    if (!baseAccountUser?.address || !castContent.trim()) {
      console.log('❌ Missing userAddress or castContent:', { 
        userAddress: baseAccountUser?.address, 
        castContent: castContent.trim() 
      });
      return;
    }

    try {
      setSubmittingCast(true);
      
      console.log('📝 Submitting cast:', {
        userAddress: baseAccountUser.address,
        castContent: castContent.trim(),
        side: selectedSide,
        transactionId
      });

      const response = await fetch('/api/battle/submit-cast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: baseAccountUser.address,
          castContent: castContent.trim(),
          side: selectedSide,
          transactionId: transactionId
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Cast submitted successfully:', data);
        setHasSubmittedCast(true);
        setCastContent('');
        setSelectedSide(null);
        setPaymentStatus('idle');
        setPaymentError(null);
        
        // Refresh user points
        fetchUserPoints(baseAccountUser.address);
        
        // Refresh casts list
        const castsResponse = await fetch('/api/battle/casts');
        const castsData = await castsResponse.json();
        if (castsData.success) {
          setCasts(castsData.casts);
        }
      } else {
        const errorMessage = data.error || 'Failed to submit cast';
        console.log('❌ Cast submission failed:', errorMessage);
        setPaymentError(errorMessage);
        setPaymentSuccessCastFailed(true);
        console.log('🆘 Payment succeeded but cast submission failed - user should contact support');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit cast';
      console.log('❌ Cast submission failed:', errorMessage);
      setPaymentError(errorMessage);
      setPaymentSuccessCastFailed(true);
    } finally {
      setSubmittingCast(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (transactionId?: string) => {
    console.log('💰 Payment completed successfully');
    console.log('📝 Transaction ID:', transactionId);
    
    setPaymentStatus('idle');
    setPaymentError(null);
    setPaymentCompleted(true);
    
    // Auto-submit the cast after successful payment
    console.log('📝 Auto-submitting argument after successful payment...');
    await submitCastAfterPayment(transactionId);
  };

  // Handle payment error
  const handlePaymentError = (error: string) => {
    console.log('❌ Payment error:', error);
    setPaymentStatus('idle');
    setPaymentError(error);
  };

  // Handle side selection
  const handleSideSelect = (side: string) => {
    setSelectedSide(side);
  };

  // Handle content change
  const handleContentChange = (content: string) => {
    setCastContent(content);
  };

  // Handle cast submission
  const handleSubmitCast = async () => {
    if (!baseAccountUser?.address || !castContent.trim()) {
      return;
    }

    try {
      setIsProcessing(true);
      
      // Check if payment is required
      const paymentCheck = await checkPaymentRequired();
      
      if (paymentCheck.requiresPayment) {
        console.log('💰 Payment required:', paymentCheck.paymentDetails);
        // Payment will be handled by UnifiedPaymentButton
        return;
      } else {
        console.log('✅ No payment required, submitting cast directly');
        await submitCastAfterPayment();
      }
    } catch (error) {
      console.error('Error submitting cast:', error);
      setPaymentError('Failed to submit cast. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle like cast
  const handleLikeCast = async (castId: string) => {
    try {
      const response = await fetch('/api/battle/like-cast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          castId,
          userAddress: baseAccountUser?.address,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Update the cast in the list
        setCasts(prevCasts => 
          prevCasts.map(cast => 
            cast.id === castId 
              ? { ...cast, likes: cast.likes + (cast.isLiked ? -1 : 1), isLiked: !cast.isLiked }
              : cast
          )
        );
      }
    } catch (error) {
      console.error('Failed to like cast:', error);
    }
  };

  // Load casts when switching to arguments tab
  useEffect(() => {
    if (activeTab === 'arguments' && casts.length === 0) {
      const loadCasts = async () => {
        try {
          const response = await fetch('/api/battle/casts');
          const data = await response.json();
          if (data.success) {
            setCasts(data.casts);
          }
        } catch (error) {
          console.error('Failed to load casts:', error);
        }
      };
      loadCasts();
    }
  }, [activeTab, casts.length]);

  // Update time remaining
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  // Debug logging for authentication state
  console.log('🔍 Main page render - baseAccountUser:', baseAccountUser);
  console.log('🔍 Main page render - isAuthenticated:', isAuthenticated);
  console.log('🔍 Main page render - environmentInfo:', environmentInfo);
  console.log('🔍 Main page render - showing auth section:', !baseAccountUser);

  return (
    <div className={styles.container}>
      {/* Authentication Landing Page */}
      {!baseAccountUser ? (
        <section className={styles.authSection}>
          <UnifiedAuth
            onAuthSuccess={handleAuthSuccess}
            onAuthError={(error) => {
              console.error('❌ Unified authentication error:', error);
            }}
            environmentInfo={environmentInfo}
          />
        </section>
      ) : (
        /* Main App Content - Only visible when authenticated */
        <section className={styles.appSection}>
          {/* App Header */}
          <AppHeader
            userAddress={baseAccountUser?.address}
            userPoints={userPoints}
            onSignOut={handleSignOut}
          />

          {/* Main Content */}
          <main className={styles.mainContent}>
            {/* Battle Card */}
            <BattleCard
              battle={currentBattle}
              timeRemaining={timeRemaining}
              isLoading={loading}
            />

            {/* Sentiment Chart */}
            {currentBattle && (
              <SentimentChart
                sentimentData={sentimentData}
                sentimentHistory={sentimentHistory}
              />
            )}

            {/* Tab Navigation */}
            <div className={styles.tabNavigation}>
              <button
                onClick={() => setActiveTab('debate')}
                className={`${styles.tabButton} ${activeTab === 'debate' ? styles.activeTab : ''}`}
              >
                💬 Debate
              </button>
              <button
                onClick={() => setActiveTab('arguments')}
                className={`${styles.tabButton} ${activeTab === 'arguments' ? styles.activeTab : ''}`}
              >
                📝 Arguments
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`${styles.tabButton} ${activeTab === 'history' ? styles.activeTab : ''}`}
              >
                📚 History
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`${styles.tabButton} ${activeTab === 'leaderboard' ? styles.activeTab : ''}`}
              >
                🏆 Leaderboard
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'debate' && (
              <DebateForm
                isAuthenticated={isAuthenticated}
                hasSubmittedCast={hasSubmittedCast}
                selectedSide={selectedSide}
                castContent={castContent}
                paymentStatus={paymentStatus}
                paymentError={paymentError}
                paymentSuccessCastFailed={paymentSuccessCastFailed}
                onSideSelect={handleSideSelect}
                onContentChange={handleContentChange}
                onSubmitCast={handleSubmitCast}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
              />
            )}

            {activeTab === 'arguments' && (
              <ArgumentsList
                casts={casts}
                isLoading={loading}
                onLikeCast={handleLikeCast}
              />
            )}

            {activeTab === 'history' && (
              <BattleHistory
                battleHistory={battleHistory}
                isLoading={loading}
              />
            )}

            {activeTab === 'leaderboard' && (
              <Leaderboard
                leaderboard={leaderboard}
                isLoading={loading}
              />
            )}
          </main>
        </section>
      )}
    </div>
  );
}