// Global error handler for wallet extension conflicts
// This prevents browser extensions from crashing the app

class ErrorHandler {
  constructor() {
    this.setupGlobalErrorHandling();
  }

  setupGlobalErrorHandling() {
    // Handle uncaught errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleError(event.error, event.filename, event.lineno);
      });

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, 'Promise Rejection');
      });
    }
  }

  handleError(error, filename = '', lineno = '') {
    // Check if it's a wallet extension error
    if (this.isWalletExtensionError(error, filename)) {
      console.warn('Wallet extension error detected, ignoring:', error.message);
      return true; // Prevent default error handling
    }

    // Log other errors normally
    console.error('Application error:', {
      error: error.message,
      filename,
      lineno,
      stack: error.stack
    });

    return false; // Allow default error handling
  }

  isWalletExtensionError(error, filename) {
    // Check for common wallet extension error patterns
    const extensionPatterns = [
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'Cannot set property',
      'which has only a getter',
      'tron',
      'wallet',
      'metamask',
      'coinbase'
    ];

    const errorMessage = error.message || '';
    const errorFilename = filename || '';

    return extensionPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
      errorFilename.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  // Safe wallet detection
  safeWalletDetection() {
    try {
      if (typeof window === 'undefined') return null;

      // Check for multiple wallet providers
      const wallets = [];

      // Check for MetaMask
      if (window.ethereum?.isMetaMask) {
        wallets.push({ type: 'metamask', provider: window.ethereum });
      }

      // Check for Coinbase Wallet
      if (window.ethereum?.isCoinbaseWallet) {
        wallets.push({ type: 'coinbase', provider: window.ethereum });
      }

      // Check for Rainbow Wallet
      if (window.ethereum?.isRainbow) {
        wallets.push({ type: 'rainbow', provider: window.ethereum });
      }

      // Check for Rabby Wallet
      if (window.ethereum?.isRabby) {
        wallets.push({ type: 'rabby', provider: window.ethereum });
      }

      // Check for Base Sign-In
      if (window.base) {
        wallets.push({ type: 'base', provider: window.base });
      }

      // Check for generic Ethereum providers
      if (window.ethereum && wallets.length === 0) {
        wallets.push({ type: 'ethereum', provider: window.ethereum });
      }

      return wallets.length > 0 ? wallets : null;
    } catch (error) {
      console.warn('Safe wallet detection failed:', error.message);
      return null;
    }
  }
}

const errorHandler = new ErrorHandler();
export default errorHandler;
