"use client";
import { useState, useEffect, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import styles from './MultiWalletConnect.module.css';
import { 
  isMobileDevice, 
  isIOS, 
  isAndroid, 
  getAvailableMobileWallets, 
  openWalletApp,
  type MobileWallet 
} from '../lib/utils/mobile-wallet-detection';
import {
  createWalletCallbackSession,
  generateUniversalLink,
  generateCustomSchemeCallback,
  startWalletConnectionPolling,
  handleWalletReturn,
  type WalletCallbackSession
} from '../lib/utils/mobile-wallet-callbacks';

// Extend window interface for wallet detection
declare global {
  interface Window {
    ethereum?: {
      isRabby?: boolean;
      isPhantom?: boolean;
      isTrust?: boolean;
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
    };
  }
}

interface MultiWalletConnectProps {
  onConnect: (address: string) => void;
  onError: (error: string) => void;
}

export function MultiWalletConnect({ onConnect, onError }: MultiWalletConnectProps) {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showWalletList, setShowWalletList] = useState(false);
  
  // Check if we're on mobile
  const isMobile = isMobileDevice();
  const mobileWallets = getAvailableMobileWallets();

  // Handle wallet returns when component mounts
  useEffect(() => {
    const returnedSession = handleWalletReturn();
    if (returnedSession) {
      console.log('Wallet return detected:', returnedSession);
      if (returnedSession.status === 'completed') {
        onConnect('0x' + '0'.repeat(40)); // Placeholder address
      } else {
        onError('Wallet connection failed');
      }
    }
  }, [onConnect, onError]);

  const handleConnect = async (connector: any) => {
    try {
      console.log('Attempting to connect to:', connector.name, connector.type);
      await connect({ connector });
      console.log('Connection successful');
      if (address) {
        onConnect(address);
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      onError(error.message || 'Failed to connect wallet');
    }
  };

  const handleMobileWalletConnect = async (wallet: MobileWallet) => {
    try {
      // Only use mobile wallet logic on actual mobile devices
      if (!isMobile) {
        throw new Error('Mobile wallet connection only available on mobile devices');
      }
      
      console.log('Connecting to mobile wallet:', wallet.displayName);
      
      // Check if WalletConnect is properly configured
      const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      const hasValidWalletConnectId = walletConnectProjectId && walletConnectProjectId !== 'your-walletconnect-project-id';
      
      // Handle Phantom and Coinbase Wallet differently (use built-in browsers)
      if (wallet.name === 'phantom' || wallet.name === 'coinbase') {
        console.log(`Opening ${wallet.displayName} with built-in browser`);
        const baseUrl = window.location.origin;
        const deepLink = `${wallet.name.toLowerCase()}://dapp/${encodeURIComponent(baseUrl)}`;
        
        // Open wallet app with built-in browser
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = deepLink;
        document.body.appendChild(iframe);
        
        // Remove iframe after a short delay
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
        
        setShowWalletList(false);
        return;
      }
      
      if (hasValidWalletConnectId) {
        // Use WalletConnect for other mobile wallets (MetaMask, Trust, Rainbow)
        const walletConnectConnector = connectors.find(connector => 
          connector.name.toLowerCase().includes('walletconnect')
        );
        
        if (walletConnectConnector) {
          console.log('Using WalletConnect for mobile wallet connection');
          await connect({ connector: walletConnectConnector });
          setShowWalletList(false);
          return;
        }
      }
      
      // Fallback: Use simple deep link (this won't trigger sign-in, just opens the app)
      console.log('WalletConnect not available, using fallback deep link');
      const baseUrl = window.location.origin;
      const deepLink = `${wallet.name.toLowerCase()}://dapp/${encodeURIComponent(baseUrl)}`;
      
      // Open wallet app
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);
      
      // Remove iframe after a short delay
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
      
      // Show helpful message
      onError(`Please configure WalletConnect for proper mobile wallet connection. Currently only opens the ${wallet.displayName} app.`);
      setShowWalletList(false);
      
    } catch (error: any) {
      console.error('Mobile wallet error:', error);
      onError(`Failed to connect ${wallet.displayName}: ${error.message}`);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  // Filter to show only specific wallets and remove duplicates (memoized to prevent repeated execution)
  const availableConnectors = useMemo(() => {
    return connectors.filter(connector => {
      const walletName = connector.name.toLowerCase();
      // Only include specific wallet types, avoiding generic injected connectors
      return (
        walletName === 'metamask' ||
        walletName === 'coinbase wallet' ||
        walletName === 'rabby' ||
        walletName === 'walletconnect' ||
        walletName === 'phantom' ||
        walletName === 'trust' ||
        walletName === 'trust wallet' ||
        walletName === 'injected wallet' // Generic injected connector
      );
    }).reduce((unique, connector) => {
      const walletName = connector.name.toLowerCase();
      
      // For injected wallet, try to detect the actual wallet
      if (walletName === 'injected wallet' && typeof window !== 'undefined' && window.ethereum) {
        // Check for Rabby first (it injects isRabby property)
        if (window.ethereum.isRabby) {
          connector.name = 'Rabby Wallet';
        } else if (window.ethereum.isPhantom) {
          connector.name = 'Phantom Wallet';
        } else if (window.ethereum.isTrust) {
          connector.name = 'Trust Wallet';
        } else if (window.ethereum.isMetaMask && !window.ethereum.isRabby) {
          // Skip if MetaMask is already handled by dedicated connector
          // But only if it's not Rabby (Rabby can have both isRabby and isMetaMask)
          return unique;
        } else if (window.ethereum.isCoinbaseWallet) {
          // Skip if Coinbase Wallet is already handled by dedicated connector
          return unique;
        } else {
          connector.name = 'Browser Wallet';
        }
      }
      
      // Use a more specific key to avoid duplicates
      const walletKey = walletName.includes('metamask') ? 'metamask' :
                       walletName.includes('coinbase') ? 'coinbase' :
                       walletName.includes('rabby') ? 'rabby' :
                       walletName.includes('walletconnect') ? 'walletconnect' :
                       walletName.includes('phantom') ? 'phantom' :
                       walletName.includes('trust') ? 'trust' :
                       walletName.includes('injected') ? 'injected' : walletName;
      
      const existingIndex = unique.findIndex(c => {
        const existingName = c.name.toLowerCase();
        return (
          (walletKey === 'metamask' && existingName.includes('metamask')) ||
          (walletKey === 'coinbase' && existingName.includes('coinbase')) ||
          (walletKey === 'rabby' && existingName.includes('rabby')) ||
          (walletKey === 'walletconnect' && existingName.includes('walletconnect')) ||
          (walletKey === 'phantom' && existingName.includes('phantom')) ||
          (walletKey === 'trust' && existingName.includes('trust')) ||
          (walletKey === 'injected' && existingName.includes('injected'))
        );
      });
      
      if (existingIndex === -1) {
        unique.push(connector);
      }
      return unique;
    }, [] as typeof connectors);
  }, [connectors]);

  // Don't show connected state here - let the main page handle it
  // This component only handles the connection modal

  return (
    <>
      <div className={styles.walletConnect}>
        <button 
          onClick={() => setShowWalletList(true)}
          className={styles.connectButton}
          disabled={isPending}
        >
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </div>

      {/* Wallet Selection Modal */}
      {showWalletList && (
        <div className={styles.walletModalOverlay} onClick={() => setShowWalletList(false)}>
          <div className={styles.walletModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.walletModalHeader}>
              <h3>Choose Wallet</h3>
              <button 
                onClick={() => setShowWalletList(false)}
                className={styles.closeButton}
                title="Close"
              >
                ✕
              </button>
            </div>
            
            <div className={styles.walletOptions}>
              {isMobile ? (
                // Mobile wallet options with WalletConnect or fallback
                (() => {
                  const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
                  const hasValidWalletConnectId = walletConnectProjectId && walletConnectProjectId !== 'your-walletconnect-project-id';
                  
                  return mobileWallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={() => handleMobileWalletConnect(wallet)}
                      className={styles.walletOption}
                      disabled={isPending}
                    >
                      <div className={styles.walletIcon}>
                        <img 
                          src={wallet.icon} 
                          alt={`${wallet.displayName} icon`}
                          className={styles.walletIconImage}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling!.textContent = getWalletIconFallback(wallet.name);
                          }}
                        />
                        <span className={styles.walletIconFallback}></span>
                      </div>
                      <div className={styles.walletInfo}>
                        <div className={styles.walletName}>
                          {wallet.displayName}
                        </div>
                        <div className={styles.mobileWalletSubtext}>
                          {hasValidWalletConnectId ? 
                            (wallet.name === 'phantom' || wallet.name === 'coinbase' ? 
                              'Open App & Use Browser' : 
                              'Connect via WalletConnect'
                            ) : 
                            'Open App (Setup Required)'
                          }
                        </div>
                      </div>
                    </button>
                  ));
                })()
              ) : (
                // Desktop wallet options with browser extension connectors
                availableConnectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => {
                      handleConnect(connector);
                      setShowWalletList(false);
                    }}
                    className={styles.walletOption}
                    disabled={isPending}
                  >
                    <div className={styles.walletIcon}>
                      <img 
                        src={getWalletIcon(connector.name)} 
                        alt={`${getWalletDisplayName(connector.name)} icon`}
                        className={styles.walletIconImage}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling!.textContent = getWalletIconFallback(connector.name);
                        }}
                      />
                      <span className={styles.walletIconFallback}></span>
                    </div>
                    <div className={styles.walletInfo}>
                      <div className={styles.walletName}>
                        {getWalletDisplayName(connector.name)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            
              <div className={styles.walletHelp}>
                {isMobile ? (
                  <p>
                    Don't have a wallet? 
                    <a href="https://apps.apple.com/app/metamask/id1438144202" target="_blank" rel="noopener noreferrer"> Get MetaMask</a>, 
                    <a href="https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409" target="_blank" rel="noopener noreferrer"> Get Trust Wallet</a>, or 
                    <a href="https://apps.apple.com/app/coinbase-wallet/id1278383455" target="_blank" rel="noopener noreferrer"> Get Coinbase Wallet</a>
                  </p>
                ) : (
                  <p>Don't have a wallet? <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">Get MetaMask</a>, <a href="https://wallet.coinbase.com/" target="_blank" rel="noopener noreferrer">Get Base Wallet</a>, or <a href="https://phantom.app" target="_blank" rel="noopener noreferrer">Get Phantom</a></p>
                )}
              </div>
          </div>
        </div>
      )}
    </>
  );
}

function getWalletIcon(walletName: string): string {
  switch (walletName.toLowerCase()) {
    case 'metamask':
      return '/wallet-icons/metamask.svg';
    case 'coinbase wallet':
      return '/wallet-icons/coinbase.svg';
    case 'rabby':
      return '/wallet-icons/rabby.svg';
    case 'walletconnect':
      return '/wallet-icons/walletconnect.svg';
    case 'phantom':
      return '/wallet-icons/phantom.svg';
    case 'trust':
    case 'trust wallet':
      return '/wallet-icons/trust.svg';
    case 'injected wallet':
      return '/wallet-icons/default.svg';
    default:
      return '/wallet-icons/default.svg';
  }
}

function getWalletIconFallback(walletName: string): string {
  switch (walletName.toLowerCase()) {
    case 'metamask':
      return '🦊';
    case 'coinbase wallet':
    case 'coinbase':
      return '🔵';
    case 'rabby':
      return '🐰';
    case 'walletconnect':
      return '📱';
    case 'phantom':
      return '👻';
    case 'trust':
    case 'trust wallet':
      return '🔒';
    case 'rainbow':
      return '🌈';
    case 'injected wallet':
      return '💳';
    default:
      return '💳';
  }
}

function getWalletDisplayName(walletName: string): string {
  switch (walletName.toLowerCase()) {
    case 'metamask':
      return 'MetaMask';
    case 'coinbase wallet':
      return 'Base Wallet';
    case 'rabby':
      return 'Rabby Wallet';
    case 'walletconnect':
      return 'WalletConnect';
    case 'phantom':
      return 'Phantom';
    case 'trust':
    case 'trust wallet':
      return 'Trust Wallet';
    case 'injected wallet':
      return 'Browser Wallet';
    default:
      return walletName;
  }
}

