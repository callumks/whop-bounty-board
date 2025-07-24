'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Check, AlertCircle, Star, ArrowLeft, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Challenge {
  id: string;
  title: string;
  description: string;
  rewardType: 'USD' | 'USDC' | 'SUBSCRIPTION';
  rewardAmount: number;
  platformFee: number;
  netPayout: number;
  buyoutFeePaid: boolean;
  rewardSubscriptionId?: string;
  status: string;
  isFunded: boolean;
  creator: {
    id: string;
    username: string;
  };
}

interface Payment {
  id: string;
  type: string;
  method: string;
  amount?: number;
  currency?: string;
  status: string;
}

export default function FundChallengePage() {
  const router = useRouter();
  const params = useParams();
  const challengeId = params?.id as string;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showWhopModal, setShowWhopModal] = useState(false);

  useEffect(() => {
    if (challengeId) {
      fetchChallengeData();
    }
  }, [challengeId]);

  const fetchChallengeData = async () => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}/fund`);
      if (!response.ok) {
        throw new Error('Failed to fetch challenge data');
      }
      const data = await response.json();
      setChallenge(data.challenge);
      setPayments(data.payments || []);
      
      // If already funded, redirect to challenge page
      if (data.challenge?.isFunded) {
        router.push(`/challenges/${challengeId}`);
        return;
      }
    } catch (err) {
      setError('Failed to load challenge data');
    } finally {
      setLoading(false);
    }
  };

  const handleWhopCheckout = async () => {
    if (!challenge) return;

    setProcessingPayment(true);
    setError(null);
    setSuccess(null);

    try {
      // Step 1: Create charge via our API
      const response = await fetch('/api/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challengeId: challenge.id,
          userId: challenge.creator.id,
          amount: calculateTotalCost(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      // Handle subscription challenges (no payment needed)
      if (data.type === 'subscription') {
        setSuccess(data.message || 'Challenge funded successfully!');
        setTimeout(() => {
          router.push(`/challenges/${challengeId}`);
        }, 2000);
        return;
      }

      // Step 2: For now, simulate Whop checkout process
      // In a real implementation, this would integrate with Whop's actual checkout
      if (data.inAppPurchase) {
        setShowWhopModal(true);
        
        // Simulate checkout completion after 3 seconds
        setTimeout(async () => {
          setShowWhopModal(false);
          await confirmPaymentCompletion(data.inAppPurchase.id);
          setSuccess('Payment completed successfully! Challenge is now live.');
          setTimeout(() => {
            router.push(`/challenges/${challengeId}`);
          }, 2000);
        }, 3000);
      } else {
        throw new Error('Failed to create Whop checkout session');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const confirmPaymentCompletion = async (purchaseId: string) => {
    try {
      // Poll for payment completion
      const checkStatus = async (retries = 5): Promise<void> => {
        const response = await fetch(`/api/charge?purchaseId=${purchaseId}`);
        
        if (!response.ok) {
          throw new Error('Failed to check payment status');
        }
        
        const statusData = await response.json();
        
        if (statusData.purchase.status === 'completed') {
          // Update challenge status in our database
          await updateChallengeStatus();
          return;
        } else if (statusData.purchase.status === 'failed') {
          throw new Error('Payment failed');
        } else if (retries > 0) {
          // Wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          return checkStatus(retries - 1);
        } else {
          throw new Error('Payment confirmation timeout');
        }
      };

      await checkStatus();
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      throw error;
    }
  };

  const updateChallengeStatus = async () => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isFunded: true,
          status: 'ACTIVE',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update challenge status');
      }
    } catch (error) {
      console.error('Failed to update challenge status:', error);
      // Don't throw here as payment was successful
    }
  };

  const calculateTotalCost = () => {
    if (!challenge) return 0;
    if (challenge.rewardType === 'SUBSCRIPTION') return 0;
    
    return challenge.buyoutFeePaid 
      ? challenge.rewardAmount + 25 // Assuming $25 buyout fee
      : challenge.rewardAmount + challenge.platformFee;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whop-purple mx-auto mb-4"></div>
          <p className="text-gray-600">Loading challenge details...</p>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Challenge Not Found</h1>
          <p className="text-gray-600 mb-6">The challenge you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => router.push('/challenges')}
            className="btn btn-primary"
          >
            Browse Challenges
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fund Your Challenge</h1>
          <p className="text-gray-600">
            Complete the funding process using Whop's secure checkout to activate your challenge.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Challenge Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Challenge Summary</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">{challenge.title}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-3">{challenge.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">Reward Type</p>
                  <p className="font-medium">
                    {challenge.rewardType === 'SUBSCRIPTION' ? 'Subscription Pass' : challenge.rewardType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reward Amount</p>
                  <p className="font-medium">
                    {challenge.rewardType === 'SUBSCRIPTION' 
                      ? 'Subscription Access' 
                      : formatCurrency(challenge.rewardAmount)
                    }
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-lg flex items-center ${
                challenge.status === 'DRAFT' 
                  ? 'bg-yellow-50 border border-yellow-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                <AlertCircle className={`w-5 h-5 mr-3 ${
                  challenge.status === 'DRAFT' ? 'text-yellow-600' : 'text-green-600'
                }`} />
                <div>
                  <p className={`font-medium ${
                    challenge.status === 'DRAFT' ? 'text-yellow-800' : 'text-green-800'
                  }`}>
                    {challenge.status === 'DRAFT' ? 'Pending Funding' : 'Funded & Active'}
                  </p>
                  <p className={`text-sm ${
                    challenge.status === 'DRAFT' ? 'text-yellow-700' : 'text-green-700'
                  }`}>
                    {challenge.status === 'DRAFT' 
                      ? 'Complete funding to activate your challenge'
                      : 'Your challenge is live and accepting submissions'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Funding Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Complete Payment</h2>

            {/* Payment Method */}
            {challenge.rewardType === 'SUBSCRIPTION' ? (
              <div className="p-4 border-2 border-whop-purple bg-whop-purple/5 rounded-lg mb-6">
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-whop-purple mr-3" />
                  <div>
                    <div className="font-medium text-whop-purple">Subscription Credits</div>
                    <div className="text-sm text-gray-600">Use your available subscription credits</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border-2 border-whop-purple bg-whop-purple/5 rounded-lg mb-6">
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 text-whop-purple mr-3" />
                  <div>
                    <div className="font-medium text-whop-purple">Whop Checkout</div>
                    <div className="text-sm text-gray-600">Secure payment via Whop's billing system</div>
                  </div>
                </div>
              </div>
            )}

            {/* Cost Breakdown */}
            {challenge.rewardType !== 'SUBSCRIPTION' && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium mb-2">Cost Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Reward Amount:</span>
                    <span>{formatCurrency(challenge.rewardAmount)}</span>
                  </div>
                  {challenge.buyoutFeePaid ? (
                    <div className="flex justify-between">
                      <span>Buyout Fee:</span>
                      <span>{formatCurrency(25)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span>Platform Fee (10%):</span>
                      <span>{formatCurrency(challenge.platformFee)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 font-medium flex justify-between">
                    <span>Total Cost:</span>
                    <span>{formatCurrency(calculateTotalCost())}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Payment Failed</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex">
                  <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-green-800">Success!</h3>
                    <p className="text-sm text-green-700 mt-1">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Fund Button */}
            <button
              onClick={handleWhopCheckout}
              disabled={processingPayment || !!success}
              className="w-full btn btn-primary btn-lg"
            >
              {processingPayment ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing Payment...
                </div>
              ) : success ? (
                'Funded Successfully!'
              ) : (
                `Fund Challenge ${challenge.rewardType !== 'SUBSCRIPTION' ? `(${formatCurrency(calculateTotalCost())})` : ''}`
              )}
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
              {challenge.rewardType === 'SUBSCRIPTION' 
                ? 'This will assign subscription credits to fund the challenge.'
                : 'Payment processed securely through Whop. Funds held until challenge completion.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Whop Checkout Modal */}
      {showWhopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whop-purple mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Processing Payment</h3>
              <p className="text-gray-600 mb-4">
                Please wait while we process your payment through Whop's secure checkout...
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  Total: {formatCurrency(calculateTotalCost())}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 