"use client";
import { useState, useMemo } from 'react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import styles from './MultiWalletConnect.module.css';

interface MultiWalletConnectProps {
  onConnect: (address: string) => void;
  onError: (error: string) => void;
}

export function MultiWalletConnect({ onConnect, onError }: MultiWalletConnectProps) {
  const { connectAsync, connectors, isPending } = useConnect();
  const { isConnected: _isConnected, address: _address } = useAccount();
  const { disconnect } = useDisconnect();
  const [showWalletList, setShowWalletList] = useState(false);

  const handleConnect = async (connector: { name: string; id: string }) => {
    try {
      console.log('Attempting to connect to:', connector.name);
      
      // Set explicit connection flag to indicate user-initiated connection
      localStorage.setItem('wagmi.explicitConnection', 'true');
      
      // For Base Account, implement proper Sign-In with Base flow
      if (connector.name.toLowerCase().includes('base account')) {
        console.log('🔵 Base Account connector detected - implementing Sign-In with Base');
        
        // Force a fresh connection by disconnecting first if already connected
        try {
          await disconnect();
          // Small delay to ensure disconnection is complete
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (_disconnectError) {
          console.log('No previous connection to disconnect');
        }

        // 1. Connect to get the provider
        await connectAsync({ connector });
        
        // 2. Get the Base Account provider
        const provider = connector.provider;
        if (!provider) {
          throw new Error('Base Account provider not available');
        }

        // 3. Generate nonce for SIWE
        const nonce = window.crypto.randomUUID().replace(/-/g, '');
        console.log('🔐 Generated nonce for SIWE:', nonce);

        // 4. Perform Sign-In with Ethereum authentication
        const authResult = await provider.request({
          method: 'wallet_connect',
          params: [{
            version: '1',
            capabilities: {
              signInWithEthereum: { 
                nonce, 
                chainId: '0x2105' // Base Mainnet - 8453
              }
            }
          }]
        });

        // 5. Extract authentication data
        const { accounts } = authResult;
        const { address, capabilities } = accounts[0];
        const { message, signature } = capabilities.signInWithEthereum;

        console.log('✅ Sign-In with Base successful:', { address, message, signature });

        // 6. Verify signature on backend (optional for now)
        try {
          await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, message, signature })
          });
          console.log('✅ Backend verification successful');
        } catch (verifyError) {
          console.warn('⚠️ Backend verification failed (continuing anyway):', verifyError);
        }

      } else {
        // For other wallets, use standard wagmi connection
        await connectAsync({ connector });
      }
      
      console.log('Connection successful');
      setShowWalletList(false);
    } catch (error: unknown) {
      console.error('Connection error:', error);
      // Clear the explicit connection flag on error
      localStorage.removeItem('wagmi.explicitConnection');
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      onError(errorMessage);
      setShowWalletList(false);
    }
  };

  // Simple wallet filtering - show only the connectors we want
  const availableConnectors = useMemo(() => {
    const filtered = connectors.filter(connector => {
      const walletName = connector.name.toLowerCase();
      return (
        walletName.includes('metamask') ||
        walletName.includes('base account') || // Only Base Account, not Coinbase Wallet
        walletName.includes('phantom') ||
        walletName.includes('walletconnect')
      );
    });
    
    // Remove duplicates based on connector type and name
    const uniqueConnectors = filtered.reduce((acc, connector) => {
      const key = `${connector.type}-${connector.name.toLowerCase()}`;
      if (!acc.some(c => `${c.type}-${c.name.toLowerCase()}` === key)) {
        acc.push(connector);
      }
      return acc;
    }, [] as typeof filtered);
    
    return uniqueConnectors;
  }, [connectors]);

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
                  key={connector.id}
                  onClick={() => handleConnect(connector)}
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
                    <div className={styles.walletSubtext}>
                      Connect Wallet
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className={styles.walletModalFooter}>
              <p>
                Don&apos;t have a wallet? 
                <a href="https://metamask.io" target="_blank" rel="noopener noreferrer"> Get MetaMask</a>, 
                <a href="https://wallet.coinbase.com/" target="_blank" rel="noopener noreferrer"> Get Base Wallet</a>, or 
                <a href="https://phantom.app" target="_blank" rel="noopener noreferrer"> Get Phantom</a>
              </p>
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
    case 'base account':
    case 'baseaccount':
    case 'base-account':
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
    case 'base account':
    case 'baseaccount':
    case 'base-account':
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
    default:
      return '💳';
  }
}

function getWalletDisplayName(walletName: string): string {
  switch (walletName.toLowerCase()) {
    case 'metamask':
      return 'MetaMask';
    case 'base account':
    case 'baseaccount':
    case 'base-account':
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