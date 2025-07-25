'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Wallet, DollarSign, Clock } from 'lucide-react';

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
  fundingMethod?: string;
}

interface UserBalance {
  balance: number;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export default function FundChallengePage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;
  
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [fundingMethod, setFundingMethod] = useState<'checkout' | 'credits'>('checkout');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchChallenge(),
      fetchUserBalance()
    ]).finally(() => setLoading(false));
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
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await fetch('/api/credits/balance');
      if (response.ok) {
        const data = await response.json();
        setUserBalance(data);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const handleCheckoutFunding = async () => {
    if (!challenge) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challenge.id,
          amount: challenge.rewardAmount,
          creatorId: userBalance?.user.id
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

  const handleCreditsFunding = async () => {
    if (!challenge || !userBalance) return;
    
    const totalCost = challenge.rewardAmount + challenge.platformFee;
    if (userBalance.balance < totalCost) {
      alert('Insufficient credits. Please add more credits or use checkout.');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/credits/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challenge.id,
          amount: challenge.rewardAmount,
          platformFee: challenge.platformFee
        })
      });

      if (response.ok) {
        alert('Challenge funded successfully with credits!');
        router.push(`/challenges/${challengeId}`);
      } else {
        const error = await response.json();
        alert('Failed to fund with credits: ' + error.error);
      }
    } catch (error) {
      console.error('Credits funding error:', error);
      alert('Failed to fund with credits');
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
          <Button onClick={() => router.push('/challenges')}>
            Back to Challenges
          </Button>
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
          <Button onClick={() => router.push(`/challenges/${challengeId}`)}>
            View Challenge
          </Button>
        </div>
      </div>
    );
  }

  const totalCost = challenge.rewardAmount + challenge.platformFee;
  const canUseCredits = userBalance && userBalance.balance >= totalCost;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fund Challenge</h1>
          <p className="text-gray-600">Choose how you'd like to fund your challenge</p>
        </div>

        {/* Challenge Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {challenge.title}
            </CardTitle>
            <CardDescription>
              Funding breakdown for your challenge
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Reward Amount</span>
              <span className="font-semibold">${challenge.rewardAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee (10%)</span>
              <span className="font-semibold">${challenge.platformFee.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Cost</span>
              <span>${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Deadline: {new Date(challenge.deadline).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Funding Methods */}
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-semibold">Choose Funding Method</h2>
          
          {/* Checkout Option */}
          <Card className={`cursor-pointer transition-colors ${fundingMethod === 'checkout' ? 'ring-2 ring-blue-500' : ''}`}>
            <CardContent className="p-6" onClick={() => setFundingMethod('checkout')}>
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    checked={fundingMethod === 'checkout'}
                    onChange={() => setFundingMethod('checkout')}
                    className="mr-3"
                  />
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Pay with Whop Checkout</h3>
                  <p className="text-sm text-gray-600">Secure payment via Whop's integrated checkout</p>
                </div>
                <Badge variant="outline">Recommended</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Credits Option */}
          <Card className={`cursor-pointer transition-colors ${fundingMethod === 'credits' ? 'ring-2 ring-blue-500' : ''} ${!canUseCredits ? 'opacity-50' : ''}`}>
            <CardContent className="p-6" onClick={() => canUseCredits && setFundingMethod('credits')}>
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    checked={fundingMethod === 'credits'}
                    onChange={() => setFundingMethod('credits')}
                    disabled={!canUseCredits}
                    className="mr-3"
                  />
                  <Wallet className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Use Credits</h3>
                  <p className="text-sm text-gray-600">
                    Available: ${userBalance?.balance.toFixed(2) || '0.00'} 
                    {canUseCredits ? ' (Sufficient)' : ' (Insufficient)'}
                  </p>
                </div>
                {canUseCredits && <Badge variant="secondary">Instant</Badge>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/challenges/${challengeId}`)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={fundingMethod === 'checkout' ? handleCheckoutFunding : handleCreditsFunding}
            disabled={processing || (fundingMethod === 'credits' && !canUseCredits)}
            className="flex-1"
          >
            {processing ? 'Processing...' : `Fund with ${fundingMethod === 'checkout' ? 'Checkout' : 'Credits'}`}
          </Button>
        </div>

        {/* Additional Info */}
        {!canUseCredits && (
          <Card className="mt-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <p className="text-sm text-orange-800">
                💡 <strong>Need more credits?</strong> You can add credits to your account for faster future payments.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => router.push('/credits/deposit')}
              >
                Add Credits
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 