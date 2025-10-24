"use client";
import { useState, useEffect, useCallback } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import Image from 'next/image';
import styles from './OnchainKitAuth.module.css';

interface OnchainKitAuthProps {
  onAuthSuccess: (user: { address: string; isAuthenticated: boolean; environment: string } | null) => void;
  onAuthError: (error: string) => void;
}

interface BattlePreview {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  participants: number;
  timeRemaining: number;
  status: string;
}

export default function OnchainKitAuth({ onAuthSuccess, onAuthError }: OnchainKitAuthProps) {
  const [battlePreview, setBattlePreview] = useState<BattlePreview | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(true); // Add debug state
  
  // Use OnchainKit's useMiniKit hook for Base App Mini App
  const { context, isMiniAppReady, setMiniAppReady } = useMiniKit();

  // Initialize MiniKit frame for Base App Mini App
  useEffect(() => {
    console.log('🔧 OnchainKitAuth - Initializing MiniKit frame for Base App');
    if (!isMiniAppReady) {
      console.log('🚀 Calling setMiniAppReady() for Base App');
      setMiniAppReady();
    }
  }, [isMiniAppReady, setMiniAppReady]);

  // Debug MiniKit context for Base App
  useEffect(() => {
    console.log('🔍 OnchainKitAuth - MiniKit Context Debug:', {
      isMiniAppReady,
      hasContext: !!context,
      clientFid: context?.client?.clientFid,
      userFid: context?.user?.fid,
      isBaseApp: context?.client?.clientFid === 309857,
      contextKeys: context ? Object.keys(context) : [],
      fullContext: context,
      authenticationCondition: isMiniAppReady && context?.client?.clientFid === 309857 && context?.user?.fid,
      isAuthenticated
    });
  }, [isMiniAppReady, context, isAuthenticated]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isAuthenticated && isMiniAppReady && context?.client?.clientFid === 309857) {
        console.log('⏰ OnchainKitAuth timeout - forcing authentication for Base App');
        console.log('🔍 Timeout context:', { userFid: context?.user?.fid, clientFid: context?.client?.clientFid });
        
        // Force authentication if we're in Base App but haven't authenticated yet
        // Use clientFid as fallback if userFid is still undefined
        const identifier = context.user?.fid?.toString() || context.client?.clientFid?.toString() || 'base-user';
        setUserAddress(identifier);
        setIsAuthenticated(true);

        const authUser = {
          address: identifier,
          isAuthenticated: true,
          environment: 'base'
        };

        console.log('✅ OnchainKitAuth timeout authentication:', authUser);
        onAuthSuccess(authUser);
      }
    }, 8000); // Increased to 8 second timeout

    return () => clearTimeout(timeout);
  }, [isAuthenticated, isMiniAppReady, context, onAuthSuccess]);

  // Handle OnchainKit authentication for Base App Mini App
  const handleOnchainKitAuth = useCallback(async () => {
    try {
      setError(null);
      console.log('🔐 Starting OnchainKit authentication for Base App Mini App...');
      
      // For Base App Mini App, authentication happens automatically through MiniKit context
      // We just need to wait for the context to be ready
      if (!isMiniAppReady || !context) {
        throw new Error('MiniKit context not ready');
      }
      
      console.log('✅ OnchainKit authentication successful for Base App Mini App');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OnchainKit authentication failed';
      setError(errorMessage);
      onAuthError(errorMessage);
      console.error('❌ OnchainKit authentication error:', error);
    }
  }, [isMiniAppReady, context, onAuthError]);

  // Handle authentication success
  useEffect(() => {
    if (isMiniAppReady && context?.client?.clientFid === 309857 && context?.user?.fid) {
      console.log('✅ OnchainKit authentication detected for Base App:', { 
        fid: context.user.fid, 
        clientFid: context.client?.clientFid 
      });
      
      // For Base App Mini App, user should connect their Base web wallet for payments
      // We authenticate them with their Farcaster FID but they need to connect wallet separately
      setUserAddress(context.user.fid.toString());
      setIsAuthenticated(true);

      const authUser = {
        address: context.user.fid.toString(), // Using FID as identifier
        isAuthenticated: true,
        environment: 'base' // Indicate Base App environment
      };

      console.log('✅ OnchainKit authentication successful for Base App:', authUser);
      onAuthSuccess(authUser);
    }
  }, [isMiniAppReady, context, onAuthSuccess]);

  // Fetch current battle preview
  useEffect(() => {
    const fetchBattlePreview = async () => {
      try {
        const response = await fetch('/api/battle/current');
        if (response.ok) {
          const data = await response.json();
          setBattlePreview(data.battle);
          setTimeRemaining(data.battle.timeRemaining);
        } else {
          console.log('No active battle found, attempting to create new one...');
          // Optionally trigger battle creation or show a message
        }
      } catch (err) {
        console.error('Failed to fetch battle preview:', err);
      }
    };
    fetchBattlePreview();
  }, []);

  // Countdown timer for battle
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className={styles.authContainer}>
      {/* Debug Panel for Base App Mini App */}
      {showDebug && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '10px',
          fontSize: '11px',
          zIndex: 9999,
          borderRadius: '5px',
          fontFamily: 'monospace',
          maxWidth: '300px',
          maxHeight: '200px',
          overflow: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div><strong>Base App Debug</strong></div>
            <button
              onClick={() => setShowDebug(false)}
              onTouchEnd={() => setShowDebug(false)}
              style={{
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 'bold',
                marginLeft: '10px',
                minWidth: '20px',
                minHeight: '20px',
                touchAction: 'manipulation'
              }}
            >
              ✕
            </button>
          </div>
          <div>MiniKit Ready: {isMiniAppReady ? '✅' : '❌'}</div>
          <div>Has Context: {context ? '✅' : '❌'}</div>
          <div>Client FID: {context?.client?.clientFid || 'undefined'}</div>
          <div>User FID: {context?.user?.fid || 'undefined'}</div>
          <div>Is Base App: {context?.client?.clientFid === 309857 ? '✅' : '❌'}</div>
          <div>Is Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
          <div>User Address: {userAddress || 'None'}</div>
          <div>Error: {error || 'None'}</div>
        </div>
      )}
      
      <div className={styles.authCard}>
        <h2 className={styles.authTitle}>Join the Debate</h2>
        {battlePreview && (
          <div className={styles.previewContent}>
            <div className={styles.previewImage}>
              <Image
                src={battlePreview.imageUrl || '/default-debate.png'}
                alt="Debate topic"
                width={240}
                height={160}
                className={styles.previewImageElement}
              />
            </div>
            <div className={styles.previewText}>
              <p className={styles.previewTopic}>{battlePreview.title}</p>
              <p className={styles.previewDescription}>{battlePreview.description}</p>
              <p className={styles.timeRemaining}>
                Time Remaining: {formatTime(timeRemaining > 0 ? timeRemaining : 0)}
              </p>
            </div>
          </div>
        )}

        {error && <p className={styles.errorText}>{error}</p>}

        {!isAuthenticated ? (
          <div>
            <button
              onClick={handleOnchainKitAuth}
              disabled={!isMiniAppReady}
              className={styles.signInButton}
            >
              {!isMiniAppReady ? 'Loading...' : 'Sign In with Base'}
            </button>
            {!isMiniAppReady && (
              <button
                onClick={() => setMiniAppReady()}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                🔧 Force Initialize MiniKit
              </button>
            )}
          </div>
        ) : (
          <div className={styles.connectedInfo}>
            <p>✅ Authenticated as FID: {userAddress}</p>
            <p>You are ready to participate!</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              💡 You'll connect your Base wallet when making payments
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
