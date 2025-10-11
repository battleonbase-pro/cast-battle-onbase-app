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

  // Filter out Farcaster connector for non-Farcaster environments
  const availableConnectors = connectors.filter(connector => 
    connector.name !== 'Farcaster Mini App'
  );

  if (isConnected && address) {
    return (
      <div className={styles.connectedWallet}>
        <div className={styles.walletInfo}>
          <div className={styles.walletIcon}>🔗</div>
          <div className={styles.walletDetails}>
            <div className={styles.walletAddress}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
            <div className={styles.walletStatus}>Connected</div>
          </div>
        </div>
        <button 
          onClick={handleDisconnect}
          className={styles.disconnectButton}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={styles.walletConnect}>
      {!showWalletList ? (
        <button 
          onClick={() => setShowWalletList(true)}
          className={styles.connectButton}
          disabled={isPending}
        >
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className={styles.walletList}>
          <div className={styles.walletListHeader}>
            <h3>Choose Wallet</h3>
            <button 
              onClick={() => setShowWalletList(false)}
              className={styles.closeButton}
            >
              ✕
            </button>
          </div>
          
          <div className={styles.walletOptions}>
            {availableConnectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => handleConnect(connector)}
                className={styles.walletOption}
                disabled={isPending}
              >
                <div className={styles.walletIcon}>
                  {getWalletIcon(connector.name)}
                </div>
                <div className={styles.walletName}>
                  {getWalletDisplayName(connector.name)}
                </div>
                <div className={styles.walletDescription}>
                  {getWalletDescription(connector.name)}
                </div>
              </button>
            ))}
          </div>
          
          <div className={styles.walletHelp}>
            <p>Don't have a wallet? <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">Get MetaMask</a></p>
          </div>
        </div>
      )}
    </div>
  );
}

function getWalletIcon(walletName: string): string {
  switch (walletName.toLowerCase()) {
    case 'metamask':
      return '🦊';
    case 'coinbase wallet':
      return '🔵';
    case 'walletconnect':
      return '📱';
    case 'injected':
      return '🔌';
    default:
      return '💳';
  }
}

function getWalletDisplayName(walletName: string): string {
  switch (walletName.toLowerCase()) {
    case 'metamask':
      return 'MetaMask';
    case 'coinbase wallet':
      return 'Coinbase Wallet';
    case 'walletconnect':
      return 'WalletConnect';
    case 'injected':
      return 'Browser Wallet';
    default:
      return walletName;
  }
}

function getWalletDescription(walletName: string): string {
  switch (walletName.toLowerCase()) {
    case 'metamask':
      return 'Connect using MetaMask browser extension';
    case 'coinbase wallet':
      return 'Connect using Coinbase Wallet';
    case 'walletconnect':
      return 'Connect using mobile wallet via QR code';
    case 'injected':
      return 'Connect using browser wallet';
    default:
      return 'Connect using your wallet';
  }
}
