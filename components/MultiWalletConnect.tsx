"use client";
import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import styles from './MultiWalletConnect.module.css';

interface MultiWalletConnectProps {
  onConnect: (address: string) => void;
  onError: (error: string) => void;
}

export function MultiWalletConnect({ onConnect, onError }: MultiWalletConnectProps) {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showWalletList, setShowWalletList] = useState(false);

  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector });
      if (address) {
        onConnect(address);
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      onError(error.message || 'Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  // Filter to show only specific wallets and remove duplicates
  const availableConnectors = connectors.filter(connector => {
    const walletName = connector.name.toLowerCase();
    // Only include specific wallet types, avoiding generic injected connectors
    return (
      walletName === 'metamask' ||
      walletName === 'coinbase wallet' ||
      walletName === 'rabby' ||
      walletName === 'walletconnect' ||
      walletName === 'phantom' ||
      walletName === 'trust' ||
      walletName === 'trust wallet'
    );
  }).reduce((unique, connector) => {
    const walletName = connector.name.toLowerCase();
    // Use a more specific key to avoid duplicates
    const walletKey = walletName.includes('metamask') ? 'metamask' :
                     walletName.includes('coinbase') ? 'coinbase' :
                     walletName.includes('rabby') ? 'rabby' :
                     walletName.includes('walletconnect') ? 'walletconnect' :
                     walletName.includes('phantom') ? 'phantom' :
                     walletName.includes('trust') ? 'trust' : walletName;
    
    const existingIndex = unique.findIndex(c => {
      const existingName = c.name.toLowerCase();
      return (
        (walletKey === 'metamask' && existingName.includes('metamask')) ||
        (walletKey === 'coinbase' && existingName.includes('coinbase')) ||
        (walletKey === 'rabby' && existingName.includes('rabby')) ||
        (walletKey === 'walletconnect' && existingName.includes('walletconnect')) ||
        (walletKey === 'phantom' && existingName.includes('phantom')) ||
        (walletKey === 'trust' && existingName.includes('trust'))
      );
    });
    
    if (existingIndex === -1) {
      unique.push(connector);
    }
    return unique;
  }, [] as typeof connectors);

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
              {availableConnectors.map((connector) => (
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
                          // Fallback to emoji if image fails to load
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
              ))}
            </div>
            
              <div className={styles.walletHelp}>
                <p>Don't have a wallet? <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">Get MetaMask</a>, <a href="https://wallet.coinbase.com/" target="_blank" rel="noopener noreferrer">Get Base Wallet</a>, or <a href="https://phantom.app" target="_blank" rel="noopener noreferrer">Get Phantom</a></p>
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
    default:
      return '/wallet-icons/default.svg';
  }
}

function getWalletIconFallback(walletName: string): string {
  switch (walletName.toLowerCase()) {
    case 'metamask':
      return '🦊';
    case 'coinbase wallet':
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
    default:
      return walletName;
  }
}

