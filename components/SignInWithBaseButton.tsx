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
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: isLight ? '#ffffff' : '#000000',
        border: 'none',
        borderRadius: '8px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        fontWeight: '500',
        color: isLight ? '#000000' : '#ffffff',
        minWidth: '180px',
        height: '44px',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 0.2s ease'
      }}
    >
      {loading ? (
        <div style={{
          width: '16px',
          height: '16px',
          border: `2px solid ${isLight ? '#0000FF' : '#ffffff'}`,
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      ) : (
        <>
          {/* Base Square Logo */}
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: isLight ? '#0000FF' : '#FFFFFF',
            borderRadius: '2px',
            flexShrink: 0
          }} />
          <span>Sign in with Base</span>
        </>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};
