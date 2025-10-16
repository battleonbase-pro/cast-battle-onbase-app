'use client';

import React from 'react';
import BaseAccountIntegration from '../components/BaseAccountIntegration';

export default function TestBaseAccountPage() {
  const handlePaymentSuccess = (paymentId: string) => {
    console.log('Payment successful:', paymentId);
    alert(`Payment successful! Transaction ID: ${paymentId}`);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    alert(`Payment failed: ${error}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-8 text-blue-600">
          Base Account Integration Test
        </h1>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Test the Base Account SDK integration with USDC payments
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Recipient:</strong> Contract Address<br/>
                <strong>Amount:</strong> $1.00 USDC<br/>
                <strong>Network:</strong> Base Sepolia (Testnet)
              </p>
            </div>
          </div>

          <BaseAccountIntegration
            recipient={process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'}
            amount="1.00"
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />

          <div className="text-center text-xs text-gray-500">
            <p>This is a test page for Base Account SDK integration.</p>
            <p>Payments are processed on Base Sepolia testnet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}