"use client";
import { useState, useEffect, useCallback } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { ConnectWallet, Wallet } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
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
  const [showDebug, setShowDebug] = useState<boolean>(false); // Debug disabled by default
  
  // Use OnchainKit's useMiniKit hook for Base App Mini App
  const { context, isMiniAppReady } = useMiniKit();
  
  // Use wagmi's useAccount to check wallet connection (official pattern)
  const { isConnected, address } = useAccount();

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

  // Remove manual authentication - wallet connection handles this automatically

  // Handle authentication success based on wallet connection (official pattern)
  useEffect(() => {
    if (isConnected && address && isMiniAppReady && context?.client?.clientFid === 309857) {
      console.log('✅ OnchainKitAuth - Wallet connected in Base App:', { 
        address,
        fid: context.user?.fid, 
        clientFid: context.client?.clientFid 
      });
      
      // Use wallet address as the primary identifier
      const authUser = {
        address: address, // Use wallet address
        isAuthenticated: true,
        environment: 'base' // Indicate Base App environment
      };

      console.log('✅ OnchainKitAuth authentication successful:', authUser);
      onAuthSuccess(authUser);
    }
  }, [isConnected, address, isMiniAppReady, context, onAuthSuccess]);

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

        {!isConnected ? (
          <div className={styles.walletSection}>
            <p className={styles.walletPrompt}>
              Connect your Base wallet to participate in debates
            </p>
            <Wallet>
              <ConnectWallet />
            </Wallet>
          </div>
        ) : (
          <div className={styles.connectedInfo}>
            <p>✅ Connected: {address?.substring(0, 6)}...{address?.substring(address.length - 4)}</p>
            <p>You are ready to participate!</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              💡 Your wallet is connected and ready for payments
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
