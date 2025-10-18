import React from 'react';

interface BasePayButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  colorScheme?: 'light' | 'dark';
  children?: React.ReactNode;
  className?: string;
}

export const BasePayButton: React.FC<BasePayButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  colorScheme = 'light',
  children,
  className = ''
}) => {
  const isLight = colorScheme === 'light';
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`base-pay-button ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        backgroundColor: isLight ? '#ffffff' : '#0000FF',
        border: 'none',
        borderRadius: '8px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        minWidth: '180px',
        height: '44px',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 0.2s ease'
      }}
    >
      {loading ? (
        <div style={{
          width: '20px',
          height: '20px',
          border: `2px solid ${isLight ? '#0000FF' : '#ffffff'}`,
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      ) : (
        <>
          <img 
            src={isLight ? '/images/base-account/BasePayBlueLogo.png' : '/images/base-account/BasePayWhiteLogo.png'} 
            alt="Base Pay" 
            style={{
              height: '20px',
              width: 'auto'
            }} 
          />
          {children && (
            <span style={{
              color: isLight ? '#0000FF' : '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              marginLeft: '8px'
            }}>
              {children}
            </span>
          )}
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
