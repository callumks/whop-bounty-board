'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Challenge {
  id: string;
  title: string;
  description: string;
  rewardAmount: number;
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
    
    setProcessing(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challenge.id,
          amount: challenge.rewardAmount,
          creatorId: challenge.id // This should be the creator's user ID
        })
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();
        window.location.href = checkoutUrl;
      } else {
        const error = await response.json();
        alert('Failed to create checkout session: ' + error.error);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to create checkout session');
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

  const totalCost = challenge.rewardAmount + challenge.platformFee;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fund Challenge</h1>
          <p className="text-gray-600">Complete payment to activate your challenge</p>
        </div>

        {/* Challenge Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            💰 {challenge.title}
          </h2>
          <p className="text-gray-600 mb-4">Funding breakdown for your challenge</p>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Reward Amount</span>
              <span className="font-semibold">${challenge.rewardAmount.toFixed(2)}</span>
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
                <p className="text-sm text-blue-800">Secure payment via Whop's integrated checkout system</p>
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
          >
            Cancel
          </button>
          <button
            onClick={handleWhopCheckout}
            disabled={processing}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : `Fund Challenge ($${totalCost.toFixed(2)})`}
          </button>
        </div>

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