'use client';

// Prevent prerendering - this page uses dynamic client functionality
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreateChallengeFormV2 from '@/components/challenge/CreateChallengeFormV2';
import type { FeeCalculation } from '@/lib/platform-fee';

interface CreateChallengeFormData {
  title: string;
  description: string;
  required_tags: string[];
  reward_type: 'USD' | 'USDC' | 'SUBSCRIPTION';
  reward_amount?: number;
  reward_subscription_id?: string;
  deadline: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  whop_company_id?: string;
  buyout_fee_paid: boolean;
}

export default function CreateChallengePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const router = useRouter();

  // Check if user is a creator on component mount
  useEffect(() => {
    checkCreatorStatus();
  }, []);

  const checkCreatorStatus = async () => {
    try {
      // This would typically be done by checking user context or making an API call
      // For now, we'll rely on the API endpoint to handle authorization
      setIsCreator(true); // Assume user is creator - API will enforce actual authorization
    } catch (err) {
      setIsCreator(false);
    }
  };

  const handleSubmit = async (data: CreateChallengeFormData & { feeCalculation: FeeCalculation }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Create the challenge
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          requiredTags: data.required_tags || [],
          rewardType: data.reward_type,
          rewardAmount: data.reward_amount,
          rewardSubscriptionId: data.reward_subscription_id,
          deadline: data.deadline,
          visibility: data.visibility,
          whopCompanyId: data.whop_company_id,
          buyoutFeePaid: data.buyout_fee_paid,
          feeCalculation: data.feeCalculation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create challenge');
      }

      const result = await response.json();
      
      // Redirect to the dedicated funding page
      router.push(`/challenges/${result.id}/fund`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Challenge</h1>
          <p className="mt-2 text-gray-600">
            Launch a user-generated content challenge and reward participants for their creativity.
          </p>
        </div>

        {/* Creator Only Notice */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Creators Only</h3>
              <p className="mt-1 text-sm text-blue-700">
                Challenge creation is restricted to Whop creators and company owners. If you're not a creator, you can still participate in existing challenges!
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Creating Challenge</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CreateChallengeFormV2 
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">How it Works</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold mr-3">1</span>
              <p>Create your challenge with clear requirements and reward details</p>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold mr-3">2</span>
              <p>Fund your challenge by paying the reward amount plus platform fee</p>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold mr-3">3</span>
              <p>Users submit content and you review submissions manually</p>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold mr-3">4</span>
              <p>Approve winning submissions and rewards are paid automatically</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 