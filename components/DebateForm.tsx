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
  onSideSelect: (side: string) => void;
  onContentChange: (content: string) => void;
  onSubmitCast: () => void;
  onPaymentSuccess: (transactionId?: string) => void;
  onPaymentError: (error: string) => void;
}

export default function DebateForm({
  isAuthenticated,
  hasSubmittedCast,
  selectedSide,
  castContent,
  paymentStatus,
  paymentError,
  paymentSuccessCastFailed,
  onSideSelect,
  onContentChange,
  onSubmitCast,
  onPaymentSuccess,
  onPaymentError
}: DebateFormProps) {
  const [showForm, setShowForm] = useState(false);

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
            <h3 className={styles.submittedTitle}>Argument Submitted!</h3>
            <p className={styles.submittedMessage}>
              Thank you for participating in this debate. Your argument has been submitted and you've earned 10 points!
            </p>
            <p className={styles.submittedNote}>
              Track the debate progress below and check back when it ends to see if you won!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>Submit Your Argument</h3>
        <p className={styles.formDescription}>
          Choose your side and write your argument. Entry fee: 1 USDC
        </p>
      </div>

      <div className={styles.submitForm}>
        {!showForm ? (
          <div className={styles.sideSelection}>
            <h4 className={styles.sideSelectionTitle}>Choose Your Side:</h4>
            <div className={styles.sideButtons}>
              <button
                onClick={() => {
                  onSideSelect('SUPPORT');
                  setShowForm(true);
                }}
                className={`${styles.sideButton} ${styles.supportButton}`}
              >
                ✅ Support
              </button>
              <button
                onClick={() => {
                  onSideSelect('OPPOSE');
                  setShowForm(true);
                }}
                className={`${styles.sideButton} ${styles.opposeButton}`}
              >
                ❌ Oppose
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.argumentForm}>
            <div className={styles.selectedSide}>
              <span className={styles.sideLabel}>
                You're arguing: <strong>{selectedSide === 'SUPPORT' ? '✅ Support' : '❌ Oppose'}</strong>
              </span>
              <button
                onClick={() => {
                  setShowForm(false);
                  onSideSelect('');
                }}
                className={styles.changeSideButton}
              >
                Change Side
              </button>
            </div>

            <div className={styles.inputGroup}>
              <textarea
                value={castContent}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Write your argument here... (minimum 10 characters)"
                className={styles.argumentInput}
                rows={4}
                maxLength={500}
              />
              <div className={styles.charCounter}>
                {castContent.length}/500 characters
              </div>
            </div>

            {paymentSuccessCastFailed && (
              <div className={styles.statusDisplay}>
                <div className={styles.statusError}>
                  <div className={styles.errorIcon}>⚠️</div>
                  <div className={styles.errorText}>
                    Payment succeeded but cast submission failed. Please contact support with your transaction details.
                  </div>
                </div>
              </div>
            )}

            {paymentError && (
              <div className={styles.statusDisplay}>
                <div className={styles.statusError}>
                  <div className={styles.errorIcon}>❌</div>
                  <div className={styles.errorText}>
                    Payment failed: {paymentError}
                  </div>
                </div>
              </div>
            )}

            <div className={styles.submitActions}>
              <UnifiedPaymentButton
                amount="1.00"
                currency="USDC"
                onSuccess={onPaymentSuccess}
                onError={onPaymentError}
                disabled={!castContent.trim() || castContent.trim().length < 10}
                className={styles.submitButton}
              >
                {paymentStatus === 'processing' ? 'Processing...' : 'Submit & Pay 1 USDC'}
              </UnifiedPaymentButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
