"use client";
import BaseAccountAuth from './BaseAccountAuth';
import FarcasterAuth from './FarcasterAuth';
import { useEnvironmentDetection } from '../hooks/useEnvironmentDetection';

interface UnifiedAuthProps {
  onAuthSuccess: (user: { address: string; isAuthenticated: boolean; environment: string } | null) => void;
  onAuthError: (error: string) => void;
}

export default function UnifiedAuth({ onAuthSuccess, onAuthError }: UnifiedAuthProps) {
  const environmentInfo = useEnvironmentDetection();

  // Show loading while detecting environment
  if (environmentInfo.isLoading) {
    return (
      <div>
        {/* Debug Environment Status */}
        <div style={{ 
          background: '#f0f0f0', 
          padding: '8px 16px', 
          margin: '0', 
          fontSize: '12px', 
          color: '#666',
          borderBottom: '1px solid #ddd',
          textAlign: 'center'
        }}>
          🔍 Debug: Environment = {environmentInfo.isLoading ? 'Loading...' : environmentInfo.environment} | 
          ClientFID = {environmentInfo.clientFid || 'undefined'} | 
          UserFID = {environmentInfo.userFid || 'undefined'}
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
        // Farcaster Mini App environment - use FarcasterAuth
        return (
          <FarcasterAuth 
            onAuthSuccess={onAuthSuccess} 
            onAuthError={onAuthError} 
          />
        );
      
      case 'base':
        // Base App Mini App environment - use BaseAccountAuth
        return (
          <BaseAccountAuth 
            onAuthSuccess={onAuthSuccess} 
            onAuthError={onAuthError} 
          />
        );
      
      case 'external':
      default:
        // External browsers use BaseAccountAuth
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
      {/* Debug Environment Status */}
      <div style={{ 
        background: '#f0f0f0', 
        padding: '8px 16px', 
        margin: '0', 
        fontSize: '12px', 
        color: '#666',
        borderBottom: '1px solid #ddd',
        textAlign: 'center'
      }}>
        🔍 Debug: Environment = {environmentInfo.environment} | 
        ClientFID = {environmentInfo.clientFid || 'undefined'} | 
        UserFID = {environmentInfo.userFid || 'undefined'} | 
        {environmentInfo.isMiniApp && (
          <> Mini App = Yes | Farcaster = {environmentInfo.isFarcaster ? 'Yes' : 'No'} | Base App = {environmentInfo.isBaseApp ? 'Yes' : 'No'}</>
        )}
      </div>
      
      {renderAuthComponent()}
    </div>
  );
}
