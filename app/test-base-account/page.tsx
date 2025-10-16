'use client';

import React, { useState } from 'react';
import BaseAccountAuth from '@/components/BaseAccountAuth';
import BaseAccountPayment from '@/components/BaseAccountPayment';
import { BaseAccountUser } from '@/lib/services/base-account-service';

export default function BaseAccountTest() {
  const [user, setUser] = useState<BaseAccountUser | null>(null);
  const [testDebateId] = useState(1); // Test debate ID
  const [testEntryFee] = useState("1"); // 1 USDC

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Base Account SDK Integration Test</h1>
      
      <div className="space-y-6">
        {/* Authentication Test */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Authentication Test</h2>
          <BaseAccountAuth
            onUserChange={(user) => {
              setUser(user);
              console.log('Base Account user changed:', user);
            }}
            onError={(error) => {
              console.error('Base Account error:', error);
            }}
          />
        </div>

        {/* Payment Test */}
        {user && (
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Payment Test</h2>
            <p className="text-sm text-gray-600 mb-4">
              Test USDC payment for debate participation
            </p>
            <BaseAccountPayment
              debateId={testDebateId}
              entryFee={testEntryFee}
              onPaymentSuccess={(result) => {
                console.log('Payment successful:', result);
                alert('Payment successful! Check console for details.');
              }}
              onPaymentError={(error) => {
                console.error('Payment failed:', error);
                alert(`Payment failed: ${error}`);
              }}
            />
          </div>
        )}

        {/* User Info */}
        {user && (
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <div className="space-y-2">
              <div><strong>Address:</strong> {user.address}</div>
              {user.name && <div><strong>Name:</strong> {user.name}</div>}
              {user.email && <div><strong>Email:</strong> {user.email}</div>}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <h2 className="text-xl font-semibold mb-4">Test Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Click "Sign in with Base Account" to authenticate</li>
            <li>If you have USDC balance, try the payment test</li>
            <li>Check the browser console for detailed logs</li>
            <li>Verify that the Base Account SDK is working correctly</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
