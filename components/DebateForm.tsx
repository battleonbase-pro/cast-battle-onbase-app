"use client";
import { useState } from 'react';
import UnifiedPaymentButton from './UnifiedPaymentButton';
import styles from '../app/page.module.css';

interface DebateFormProps {
  isAuthenticated: boolean;
  hasSubmittedCast: boolean;
  selectedSide: string | null;
  castContent: string;
  paymentStatus: string;
  paymentError: string | null;
  paymentSuccessCastFailed: boolean;
  transactionHash: string | null;
  onSideSelect: (side: string) => void;
  onContentChange: (content: string) => void;
  onSubmitCast: () => void;
  onPaymentSuccess: (transactionId?: string) => void;
  onPaymentError: (error: string) => void;
  currentBattle?: {
    id: string;
    title: string;
    description: string;
    debatePoints?: {
      Support: string[];
      Oppose: string[];
    };
  } | null;
}

export default function DebateForm({
  isAuthenticated,
  hasSubmittedCast,
  selectedSide,
  castContent,
  paymentStatus,
  paymentError,
  paymentSuccessCastFailed,
  transactionHash,
  onSideSelect,
  onContentChange,
  onSubmitCast,
  onPaymentSuccess,
  onPaymentError,
  currentBattle
}: DebateFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<'SUPPORT' | 'OPPOSE' | null>(null);

  // Card interaction handlers
  const handleCardHover = (side: 'SUPPORT' | 'OPPOSE' | null) => {
    setHoveredCard(side);
  };

  // Handle side selection
  const handleSideSelection = (side: 'SUPPORT' | 'OPPOSE') => {
    onSideSelect(side);
    setShowForm(true);
  };
  
  // Handle back to side selection
  const handleBackToSelection = () => {
    setShowForm(false);
    onSideSelect('');
    onContentChange('');
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.signInPrompt}>
        <p>Please connect your wallet to participate in debates.</p>
      </div>
    );
  }

  if (hasSubmittedCast) {
    return (
      <div className={styles.submitForm}>
        <div className={styles.alreadySubmitted}>
          <div className={styles.submittedIcon}>✅</div>
          <div className={styles.submittedContent}>
            <h3 className={styles.submittedTitle}>🎉 Thank You for Participating!</h3>
            <p className={styles.submittedMessage}>
              🎉 Thank you for participating in NewsCast Debate! Your <strong>1 USDC payment</strong> has been processed successfully and your argument has been submitted! Good luck with your debate - may the best debater win! 🏆
            </p>
            {transactionHash && (
              <p className={styles.submittedNote}>
                <strong>Transaction:</strong> <a 
                  href={`https://sepolia.basescan.org/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#0052ff', 
                    textDecoration: 'underline',
                    fontWeight: 'bold'
                  }}
                >
                  View on BaseScan
                </a>
              </p>
            )}
            <p className={styles.submittedNote}>
              Track the debate progress below and check back when it ends to see if you won!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      {!showForm ? (
        <div className={styles.debatePoints}>
          {/* Cards container */}
          <div className={styles.debateCardsContainer}>
            {/* Oppose Card */}
            <div 
              className={`${styles.debateCard} ${styles.oppose} ${hoveredCard === 'OPPOSE' ? styles.swipingLeft : ''}`}
              onClick={() => handleSideSelection('OPPOSE')}
              onMouseEnter={() => handleCardHover('OPPOSE')}
              onMouseLeave={() => handleCardHover(null)}
            >
              <div className={styles.debateCardContent}>
                <div className={styles.debateCardHeader}>
                  <h3 className={styles.debateCardTitle}>❌ Oppose</h3>
                  <p className={styles.debateCardSubtitle}>Tap to oppose this argument</p>
                </div>
                <div className={styles.debateCardPoints}>
                  <ul>
                    {currentBattle?.debatePoints?.Oppose?.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Support Card */}
            <div 
              className={`${styles.debateCard} ${styles.support} ${hoveredCard === 'SUPPORT' ? styles.swipingRight : ''}`}
              onClick={() => handleSideSelection('SUPPORT')}
              onMouseEnter={() => handleCardHover('SUPPORT')}
              onMouseLeave={() => handleCardHover(null)}
            >
              <div className={styles.debateCardContent}>
                <div className={styles.debateCardHeader}>
                  <h3 className={styles.debateCardTitle}>✅ Support</h3>
                  <p className={styles.debateCardSubtitle}>Tap to support this argument</p>
                </div>
                <div className={styles.debateCardPoints}>
                  <ul>
                    {currentBattle?.debatePoints?.Support?.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <button 
              className={styles.backButton}
              onClick={handleBackToSelection}
              aria-label="Back to side selection"
            >
              ← Back
            </button>
            <h3 className={styles.formTitle}>
              Submit Your Argument
            </h3>
          </div>
          
          <div className={styles.submitForm}>
            {/* Argument Submission Form */}
            <textarea
              className={styles.argumentInput}
              placeholder="Your argument... (140 chars max)"
              value={castContent}
              onChange={(e) => onContentChange(e.target.value)}
              rows={3}
              maxLength={140}
            />
            <div className={styles.charCounter}>
              {castContent.length}/140 characters
            </div>
            
            {/* Single Payment Button with Dynamic States */}
            <UnifiedPaymentButton
              onClick={() => {
                // Direct payment trigger - the x402 protocol will handle payment requirement check
                console.log('💰 Payment button clicked - triggering payment directly');
              }}
              onSuccess={onPaymentSuccess}
              disabled={castContent.trim().length < 10 || castContent.trim().length > 140 || paymentSuccessCastFailed}
              loading={paymentStatus === 'processing'}
              amount="1.00"
              recipientAddress={process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS!}
            >
              {paymentStatus === 'processing' 
                ? 'Processing Payment...'
                : paymentSuccessCastFailed
                ? 'Contact Support'
                : 'Pay & Submit'
              }
            </UnifiedPaymentButton>
            
            {/* Single Status Display - Only for errors */}
            {paymentStatus === 'failed' && (
              <div className={styles.statusDisplay}>
                <div className={styles.statusError}>
                  <span className={styles.errorIcon}>❌</span>
                  <p className={styles.errorText}>
                    {paymentError || 'Payment failed. Please try again.'}
                  </p>
                </div>
              </div>
            )}

            {/* Special Error Display for Payment Success + Cast Failure */}
            {paymentSuccessCastFailed && (
              <div className={styles.statusDisplay}>
                <div className={styles.statusError}>
                  <span className={styles.errorIcon}>⚠️</span>
                  <div className={styles.errorText}>
                    <p><strong>Payment Successful ✅</strong></p>
                    <p>Your 1 USDC payment was processed successfully, but we encountered an issue submitting your argument.</p>
                    <p><strong>Please contact customer support with these details:</strong></p>
                    <ul style={{ fontSize: '0.9em', marginTop: '8px' }}>
                      <li>Error: Payment succeeded but cast submission failed</li>
                      <li>Timestamp: {new Date().toISOString()}</li>
                      <li>Argument: "{castContent.trim()}"</li>
                    </ul>
                    <p style={{ marginTop: '12px', fontSize: '0.9em' }}>
                      <strong>Contact:</strong> support@newsdebate.com or Discord: #support
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
