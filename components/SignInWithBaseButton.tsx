import React from 'react';

interface SignInWithBaseButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  colorScheme?: 'light' | 'dark';
  className?: string;
}

export const SignInWithBaseButton: React.FC<SignInWithBaseButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  colorScheme = 'light',
  className = ''
}) => {
  const isLight = colorScheme === 'light';
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`sign-in-with-base-button ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '14px 20px',
        backgroundColor: isLight ? '#ffffff' : '#000000',
        border: 'none',
        borderRadius: '12px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        fontWeight: '600',
        color: isLight ? '#000000' : '#ffffff',
        minWidth: '200px',
        height: '52px',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: isLight ? '1px solid #e5e7eb' : '1px solid #374151'
      }}
    >
      {loading ? (
        <div style={{
          width: '20px',
          height: '20px',
          border: `3px solid ${isLight ? '#0000FF' : '#ffffff'}`,
          borderTop: '3px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      ) : (
        <>
          {/* Base Square Logo - Larger */}
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: isLight ? '#0000FF' : '#FFFFFF',
            borderRadius: '4px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Base "B" logo */}
            <span style={{
              color: isLight ? '#FFFFFF' : '#0000FF',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>B</span>
          </div>
          <span>Sign in with Base</span>
        </>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .sign-in-with-base-button {
            min-width: 180px !important;
            height: 48px !important;
            font-size: 15px !important;
            padding: 12px 16px !important;
            gap: 8px !important;
          }
        }
        
        @media (max-width: 480px) {
          .sign-in-with-base-button {
            min-width: 160px !important;
            height: 44px !important;
            font-size: 14px !important;
            padding: 10px 14px !important;
            gap: 6px !important;
          }
        }
      `}</style>
    </button>
  );
};
