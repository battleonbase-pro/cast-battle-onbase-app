"use client";
import { useState, useEffect } from 'react';
import BaseAuth from './BaseAuth';
import FarcasterAuth from './FarcasterAuth';
import { useEnvironmentDetection } from '../hooks/useEnvironmentDetection';

interface UnifiedAuthProps {
  onAuthSuccess: (user: { address: string; isAuthenticated: boolean; environment: string } | null) => void;
  onAuthError: (error: string) => void;
}

export default function UnifiedAuth({ onAuthSuccess, onAuthError }: UnifiedAuthProps) {
  const environmentInfo = useEnvironmentDetection();
  const [isLoading, setIsLoading] = useState(true);

  // Set loading to false once environment is detected
  useEffect(() => {
    if (environmentInfo.environment) {
      setIsLoading(false);
    }
  }, [environmentInfo.environment]);

  // Show loading while detecting environment
  if (isLoading) {
    return (
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
    );
  }

  // Render appropriate authentication component based on environment
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
        <BaseAuth 
          onAuthSuccess={onAuthSuccess} 
          onAuthError={onAuthError} 
        />
      );
  }
}
