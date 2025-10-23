"use client";
import { useState, useEffect } from 'react';
import BaseAccountAuth from './BaseAccountAuth';
import FarcasterAuth from './FarcasterAuth';
import { useEnvironmentDetection } from '../hooks/useEnvironmentDetection';
import { sdk } from '@farcaster/miniapp-sdk';

interface UnifiedAuthProps {
  onAuthSuccess: (user: { address: string; isAuthenticated: boolean; environment: string } | null) => void;
  onAuthError: (error: string) => void;
}

export default function UnifiedAuth({ onAuthSuccess, onAuthError }: UnifiedAuthProps) {
  const environmentInfo = useEnvironmentDetection();
  const [isMiniApp, setIsMiniApp] = useState<boolean | null>(null);

  // Detect mini app environment
  useEffect(() => {
    const detectMiniApp = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsMiniApp(inMiniApp);
        console.log('🔍 Mini App Detection:', inMiniApp);
      } catch (error) {
        console.error('❌ Failed to detect mini app:', error);
        setIsMiniApp(false);
      }
    };

    detectMiniApp();
  }, []);

  // Show loading while detecting environment
  if (environmentInfo.isLoading) {
    return (
      <div>
        {/* Debug Mini App Status */}
        <div style={{ 
          background: '#f0f0f0', 
          padding: '8px 16px', 
          margin: '0', 
          fontSize: '12px', 
          color: '#666',
          borderBottom: '1px solid #ddd',
          textAlign: 'center'
        }}>
          🔍 Debug: isMiniApp = {isMiniApp === null ? 'Loading...' : isMiniApp ? 'true' : 'false'}
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '20px',
          color: '#666'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontSize: '14px' }}>Detecting environment...</div>
          </div>
        </div>
      </div>
    );
  }

  // Render appropriate authentication component based on environment
  const renderAuthComponent = () => {
    switch (environmentInfo.environment) {
      case 'farcaster':
        return (
          <FarcasterAuth 
            onAuthSuccess={onAuthSuccess} 
            onAuthError={onAuthError} 
          />
        );
      
      case 'base':
      case 'external':
      default:
        return (
          <BaseAccountAuth 
            onAuthSuccess={onAuthSuccess} 
            onAuthError={onAuthError} 
          />
        );
    }
  };

  return (
    <div>
      {/* Debug Mini App Status */}
      <div style={{ 
        background: '#f0f0f0', 
        padding: '8px 16px', 
        margin: '0', 
        fontSize: '12px', 
        color: '#666',
        borderBottom: '1px solid #ddd',
        textAlign: 'center'
      }}>
        🔍 Debug: isMiniApp = {isMiniApp === null ? 'Loading...' : isMiniApp ? 'true' : 'false'}
      </div>
      
      {renderAuthComponent()}
    </div>
  );
}
