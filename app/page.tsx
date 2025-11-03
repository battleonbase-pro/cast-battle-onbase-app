"use client";
import { useState, useEffect, useCallback } from "react";
import { sdk } from '@farcaster/miniapp-sdk';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useEnvironmentDetection } from '../hooks/useEnvironmentDetection';
import { useAuth } from '../contexts/AuthContext';
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
  const { user: baseAccountUser, setUser, isAuthenticated, formState, setCastContent, setSelectedSide, clearFormState } = useAuth();
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [paymentSuccessCastFailed, setPaymentSuccessCastFailed] = useState(false);
  const [_paymentCompleted, setPaymentCompleted] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [currentBattle, setCurrentBattle] = useState<Battle | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  // Form state now managed by context
  const selectedSide = formState.selectedSide;
  const castContent = formState.castContent;
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
  const [_isProcessing, setIsProcessing] = useState(false);
  const [hasProcessedPayment, setHasProcessedPayment] = useState(false);
  const [isSubmittingCast, setIsSubmittingCast] = useState(false);

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

  // Fetch user points - memoized to prevent re-creation
  const fetchUserPoints = useCallback(async (address: string) => {
    try {
      const response = await fetch(`/api/user/points?address=${address}`);
      const data = await response.json();
      if (data.success) {
        setUserPoints(data.points);
      }
    } catch (error) {
      console.error('Failed to fetch user points:', error);
    }
  }, []);

  // Check if user has already submitted a cast for the current battle
  const checkUserCastStatus = useCallback(async () => {
    if (!baseAccountUser?.address || !currentBattle?.id) {
      return;
    }

    try {
      console.log('🔍 Checking if user has already submitted a cast...');
      const response = await fetch(`/api/battle/casts?address=${baseAccountUser.address}`);
      const data = await response.json();
      
      if (data.success && data.casts) {
        // Check if user has any casts
        if (data.casts.length > 0) {
          console.log('✅ User has already submitted a cast');
          setHasSubmittedCast(true);
        } else {
          console.log('✅ User can still submit a cast');
          setHasSubmittedCast(false);
        }
      }
    } catch (error) {
      console.error('❌ Error checking user cast status:', error);
    }
  }, [baseAccountUser?.address, currentBattle?.id]);

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
        
        // Note: User cast status check moved to checkUserCastStatus() to prevent bypass
      } else if (battleData.fallback) {
        // Handle database quota issues gracefully
        console.log('⚠️ Database quota exceeded, showing maintenance message');
        setError('Service temporarily unavailable due to high demand. Please try again in a few minutes.');
        setCurrentBattle(null);
        setTimeRemaining(0);
      } else {
        console.log('No active battle found, attempting to create new one...');
        // Optionally trigger battle creation or show a message
      }
      
      // Fetch user points early if user is authenticated
      if (baseAccountUser?.address) {
        fetchUserPoints(baseAccountUser.address);
      }
      
      // Fetch leaderboard
      const leaderboardResponse = await fetch('/api/user/leaderboard');
      const leaderboardData = await leaderboardResponse.json();
      if (leaderboardData.success) {
        setLeaderboard(leaderboardData.leaderboard);
      }
      
      // Fetch battle history
      const historyResponse = await fetch('/api/battle/history');
      const historyData = await historyResponse.json();
      if (historyData.success && historyData.battles) {
        setBattleHistory(historyData.battles); // API returns 'battles' not 'history'
      }
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [baseAccountUser?.address, fetchUserPoints]); // Added dependencies

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
    
    // Set authentication state via context
    setUser(user);
    
    // Fetch user points immediately (don't wait)
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
  }, [isConnected, connect, connectors, context, fetchUserPoints, loadInitialData, setUser]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      console.log('🔐 Manual logout triggered');
      
      // Clear user state FIRST to prevent auto-re-authentication
      setUser(null);
      
      // Disconnect wagmi wallet if connected
      if (isConnected) {
        console.log('🔌 Disconnecting wallet...');
        await disconnect();
        // Wait a bit for disconnect to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Clear all other state
      setCurrentBattle(null);
      setTimeRemaining(null);
      clearFormState(); // Clear form state in context
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
      setHasProcessedPayment(false);
      setIsSubmittingCast(false);
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
          content: castContent.trim(),
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
  const submitCastAfterPayment = useCallback(async (transactionId?: string) => {
    console.log('🔄 submitCastAfterPayment called');
    console.log('📝 Transaction ID:', transactionId);
    
    // Guard: Prevent duplicate submissions
    if (hasSubmittedCast) {
      console.log('⚠️ Cast already submitted, skipping duplicate submission');
      return;
    }
    
    if (isSubmittingCast) {
      console.log('⚠️ Cast submission already in progress, skipping duplicate submission');
      return;
    }
    
    if (!baseAccountUser?.address || !castContent.trim()) {
      console.log('❌ Missing userAddress or castContent:', { 
        userAddress: baseAccountUser?.address, 
        castContent: castContent.trim() 
      });
      return;
    }

    try {
      setIsSubmittingCast(true);
      
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
                  content: castContent.trim(),
                  side: selectedSide,
          transactionId: transactionId
        }),
              });
              
      const data = await response.json();
              
      if (data.success) {
        console.log('✅ Cast submitted successfully:', data);
                setHasSubmittedCast(true);
        clearFormState(); // Clear form state in context
        setPaymentStatus('idle');
        setPaymentError(null);
        
        // Refresh user points
        if (baseAccountUser?.address) {
          fetchUserPoints(baseAccountUser.address);
        }
        
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
      setIsSubmittingCast(false);
    }
  }, [hasSubmittedCast, isSubmittingCast, baseAccountUser?.address, castContent, selectedSide, fetchUserPoints, clearFormState]);

  // Handle payment success with guard to prevent duplicate processing
  const handlePaymentSuccess = useCallback(async (transactionId?: string) => {
    // Guard: Prevent duplicate processing
    if (hasProcessedPayment) {
      console.log('⚠️ Payment already processed, skipping duplicate handling');
            return;
    }
    
    console.log('💰 Payment completed successfully');
    console.log('📝 Transaction ID:', transactionId);
    
    // Debug logging to understand current state
    console.log('🔍 [DEBUG] Current state when payment succeeds:', {
      baseAccountUser: baseAccountUser,
      baseAccountAddress: baseAccountUser?.address,
      castContent: castContent,
      selectedSide: selectedSide,
      isAuthenticated: isAuthenticated,
      castContentLength: castContent?.length,
      selectedSideValue: selectedSide
    });
    
    // Check if form data is missing
    if (!castContent || castContent.trim() === '') {
      console.error('❌ [PAYMENT DEBUG] castContent is empty at payment success!');
    }
    if (!selectedSide) {
      console.error('❌ [PAYMENT DEBUG] selectedSide is null at payment success!');
    }
    
    setHasProcessedPayment(true);
    setPaymentStatus('idle');
    setPaymentError(null);
    setPaymentCompleted(true);
    setTransactionHash(transactionId || null);
    
    // Auto-submit the cast after successful payment
    // Add a small delay to allow backend to index the transaction
    console.log('📝 Auto-submitting argument after successful payment...');
    console.log('⏳ Waiting 2 seconds for transaction to be indexed on backend...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await submitCastAfterPayment(transactionId);
  }, [hasProcessedPayment, baseAccountUser, castContent, selectedSide, isAuthenticated, submitCastAfterPayment]);

  // Handle payment error
  const handlePaymentError = (error: string) => {
    console.log('❌ Payment error:', error);
    setPaymentStatus('idle');
    setPaymentError(error);
  };

  // Handle side selection
  const handleSideSelect = (side: string) => {
    setSelectedSide(side);
    // Reset payment success state when user selects a new side
    setPaymentSuccessCastFailed(false);
    setPaymentError(null);
    setHasProcessedPayment(false);
    setIsSubmittingCast(false);
  };

  // Handle content change
  const handleContentChange = (content: string) => {
    setCastContent(content);
    // Reset payment success state when user changes content
    setPaymentSuccessCastFailed(false);
    setPaymentError(null);
  };

  // Handle cast submission
  const handleSubmitCast = async () => {
    if (!baseAccountUser?.address || !castContent.trim()) {
      return;
    }

    try {
      setIsProcessing(true);
      setPaymentStatus('processing'); // Set processing state
      
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
      setPaymentStatus('idle');
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

  // Check user's cast submission status when authenticated and battle loaded
  useEffect(() => {
    if (isAuthenticated && currentBattle?.id) {
      checkUserCastStatus();
    }
  }, [isAuthenticated, currentBattle?.id, checkUserCastStatus]);

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

  // Debug logging for authentication state (removed to prevent infinite re-renders)

  return (
    <div className={styles.container}>
      {/* Authentication Landing Page */}
              {!baseAccountUser || !isAuthenticated ? (
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
                Debate
              </button>
              <button 
                onClick={() => setActiveTab('arguments')}
                className={`${styles.tabButton} ${activeTab === 'arguments' ? styles.activeTab : ''}`}
              >
                Arguments
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`${styles.tabButton} ${activeTab === 'history' ? styles.activeTab : ''}`}
              >
                History
              </button>
              <button 
                onClick={() => setActiveTab('leaderboard')}
                className={`${styles.tabButton} ${activeTab === 'leaderboard' ? styles.activeTab : ''}`}
              >
                Leaderboard
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
                transactionHash={transactionHash}
                onSideSelect={handleSideSelect}
                onContentChange={handleContentChange}
                onSubmitCast={handleSubmitCast}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                currentBattle={currentBattle}
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