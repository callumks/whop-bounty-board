'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useIframeSdk } from '@whop/react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  platformFee: number;
  netPayout: number;
  deadline: string;
  status: string;
  isFunded: boolean;
}

export default function FundChallengePage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;
  
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [receiptId, setReceiptId] = useState<string>();
  const [error, setError] = useState<string>();

  // Get iframe SDK if available
  const iframeSdk = useIframeSdk();

  useEffect(() => {
    fetchChallenge();
  }, [challengeId]);

  const fetchChallenge = async () => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}`);
      if (response.ok) {
        const data = await response.json();
        setChallenge(data);
      }
    } catch (error) {
      console.error('Failed to fetch challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhopCheckout = async () => {
    if (!challenge) return;
    
    if (!iframeSdk) {
      setError('Whop payment system not available. Please ensure you are accessing this from within the Whop app.');
      return;
    }
    
    setProcessing(true);
    setError(undefined);
    
    try {
      const totalAmount = challenge.reward_amount + challenge.platformFee;
      console.log('Frontend sending payment:', {
        rewardAmount: challenge.reward_amount,
        platformFee: challenge.platformFee,
        totalAmount: totalAmount,
        expectedCents: Math.round(totalAmount * 100)
      });

      // 1. Create the charge on your server
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challenge.id,
          amount: totalAmount, // Send total amount, not just reward
          creatorId: (challenge as any).creatorId,
          description: `Fund challenge: ${challenge.title}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create charge');
      }

      const data = await response.json();
      
      if (data.status === "completed") {
        // Payment completed immediately (rare case)
        setReceiptId("completed");
        setError(undefined);
        // Refresh challenge data
        await fetchChallenge();
        return;
      }
      
      if (data.status === "needs_action" && data.inAppPurchase) {
        // 2. Open Whop's payment modal
        const result = await iframeSdk.inAppPurchase(data.inAppPurchase);
        
        if (result.status === "ok") {
          setReceiptId(result.data.receiptId);
          setError(undefined);
          // Payment successful - refresh challenge data
          await fetchChallenge();
          
          // Redirect to challenge page after successful funding
          setTimeout(() => {
            router.push(`/challenges/${challengeId}`);
          }, 2000);
        } else {
          setError(result.error || "Payment failed or was cancelled");
        }
      } else {
        throw new Error("Unexpected response from payment processor");
      }
      
    } catch (error: any) {
      console.error('Fund challenge failed:', error);
      setError(error.message || 'Failed to fund challenge');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Challenge Not Found</h1>
          <p className="text-gray-600 mb-6">The challenge you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/challenges')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Challenges
          </button>
        </div>
      </div>
    );
  }

  if (challenge.isFunded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">Challenge Already Funded</h1>
          <p className="text-gray-600 mb-6">This challenge has already been funded and is active.</p>
          <button
            onClick={() => router.push(`/challenges/${challengeId}`)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            View Challenge
          </button>
        </div>
      </div>
    );
  }

  const totalCost = challenge.reward_amount + challenge.platformFee;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fund Challenge</h1>
          <p className="text-gray-600">Complete payment to activate your challenge</p>
        </div>

        {/* Success Message */}
        {receiptId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Payment Successful!</h3>
                <p className="mt-1 text-sm text-green-700">
                  ✅ Challenge funded successfully! Receipt: {receiptId}
                  <br />
                  Redirecting to challenge page...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Payment Error</h3>
                <p className="mt-1 text-sm text-red-700">❌ {error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Challenge Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            💰 {challenge.title}
          </h2>
          <p className="text-gray-600 mb-4">Funding breakdown for your challenge</p>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Reward Amount</span>
              <span className="font-semibold">${challenge.reward_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee (10%)</span>
              <span className="font-semibold">${challenge.platformFee.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Cost</span>
                <span>${totalCost.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              🕒 <span>Deadline: {new Date(challenge.deadline).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
          
          <div className="border-2 border-blue-500 bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                💳
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900">Whop Checkout</h4>
                <p className="text-sm text-blue-800">Secure payment via Whop's integrated payment system</p>
              </div>
              <div className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                Recommended
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p>✅ Secure payment processing</p>
            <p>✅ Multiple payment methods supported</p>
            <p>✅ Instant challenge activation</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/challenges/${challengeId}`)}
            className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
            disabled={processing}
          >
            Cancel
          </button>
          <button
            onClick={handleWhopCheckout}
            disabled={processing || !iframeSdk}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : `Fund Challenge ($${totalCost.toFixed(2)})`}
          </button>
        </div>

        {/* SDK Warning */}
        {!iframeSdk && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Note:</strong> Payment functionality requires access through the Whop app. If you're seeing this message, please access this page from within your Whop app environment.
            </p>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-800">
            💡 <strong>What happens next?</strong> After successful payment, your challenge will be immediately activated and visible to all users. Submissions can start coming in right away!
          </p>
        </div>
      </div>
    </div>
  );
} 