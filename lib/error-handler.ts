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

      // Check for Base Sign-In
      if (window.base) {
        return { type: 'base', provider: window.base };
      }

      // Check for Ethereum providers
      if (window.ethereum) {
        return { type: 'ethereum', provider: window.ethereum };
      }

      return null;
    } catch (error) {
      console.warn('Safe wallet detection failed:', error.message);
      return null;
    }
  }
}

const errorHandler = new ErrorHandler();
export default errorHandler;
