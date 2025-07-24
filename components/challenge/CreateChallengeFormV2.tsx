'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { DollarSign, Calendar, Tag, Eye, EyeOff, AlertTriangle, CreditCard, Wallet } from 'lucide-react';
import { 
  calculatePlatformFee, 
  getFeeBreakdownText, 
  validateMinimumReward,
  formatCurrency,
  BUYOUT_FEE_AMOUNT,
  type FeeCalculation 
} from '@/lib/platform-fee';

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

interface CreateChallengeFormProps {
  onSubmit: (data: CreateChallengeFormData & { feeCalculation: FeeCalculation }) => Promise<void>;
  isLoading?: boolean;
}

export default function CreateChallengeFormV2({ onSubmit, isLoading }: CreateChallengeFormProps) {
  const [selectedRewardType, setSelectedRewardType] = useState<'USD' | 'USDC' | 'SUBSCRIPTION'>('USD');
  const [selectedVisibility, setSelectedVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [buyoutFeePaid, setBuyoutFeePaid] = useState(false);
  const [feeCalculation, setFeeCalculation] = useState<FeeCalculation | null>(null);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    trigger,
  } = useForm<CreateChallengeFormData>({
    defaultValues: {
      buyout_fee_paid: false,
    },
  });

  const watchedTags = watch('required_tags') || [];
  const watchedRewardAmount = watch('reward_amount');

  // Recalculate fees whenever reward amount or buyout status changes
  useEffect(() => {
    if (watchedRewardAmount && (selectedRewardType === 'USD' || selectedRewardType === 'USDC')) {
      const calculation = calculatePlatformFee(watchedRewardAmount, buyoutFeePaid);
      setFeeCalculation(calculation);
    } else {
      setFeeCalculation(null);
    }
  }, [watchedRewardAmount, buyoutFeePaid, selectedRewardType]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      const tag = input.value.trim();
      
      if (tag && !watchedTags.includes(tag)) {
        const newTags = [...watchedTags, tag];
        setValue('required_tags', newTags);
        input.value = '';
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = watchedTags.filter(tag => tag !== tagToRemove);
    setValue('required_tags', newTags);
  };

  const handleFormSubmit = async (data: CreateChallengeFormData) => {
    if (!feeCalculation && (selectedRewardType === 'USD' || selectedRewardType === 'USDC')) {
      return;
    }

    const formData = {
      ...data,
      reward_type: selectedRewardType,
      visibility: selectedVisibility,
      buyout_fee_paid: buyoutFeePaid,
    };

    await onSubmit({
      ...formData,
      feeCalculation: feeCalculation!,
    });
  };

  const validateRewardAmount = (value: number | undefined) => {
    if (selectedRewardType === 'SUBSCRIPTION') return true;
    if (!value) return 'Reward amount is required';
    
    const validation = validateMinimumReward(value);
    return validation.isValid || validation.message;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Create New Challenge</h1>
          <p className="text-gray-600">
            Launch a user-generated content challenge for your community with built-in monetization.
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Tag className="w-5 h-5 mr-2" />
              Basic Information
            </h2>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Challenge Title *
              </label>
              <input
                type="text"
                id="title"
                {...register('title', { required: 'Title is required' })}
                className="form-input"
                placeholder="Enter challenge title..."
              />
              {errors.title && (
                <p className="mt-1 text-sm text-danger">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                rows={5}
                {...register('description', { required: 'Description is required' })}
                className="form-textarea"
                placeholder="Describe your challenge, requirements, and what participants need to do..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-danger">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                Deadline *
              </label>
              <input
                type="datetime-local"
                id="deadline"
                {...register('deadline', { required: 'Deadline is required' })}
                className="form-input"
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.deadline && (
                <p className="mt-1 text-sm text-danger">{errors.deadline.message}</p>
              )}
            </div>

            {/* Required Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Tags
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Add tags (press Enter or comma to add)..."
                  className="form-input"
                  onKeyDown={handleAddTag}
                />
                <div className="flex flex-wrap gap-2">
                  {watchedTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-whop-purple text-white"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 hover:text-gray-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Reward Configuration with Platform Fee */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Reward & Fee Configuration
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Reward Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['USD', 'USDC', 'SUBSCRIPTION'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedRewardType(type)}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      selectedRewardType === type
                        ? 'border-whop-purple bg-whop-purple/5 text-whop-purple'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold">
                      {type === 'SUBSCRIPTION' ? 'Subscription Pass' : type}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {type === 'USD' && 'Pay winners via Stripe'}
                      {type === 'USDC' && 'Pay winners in crypto'}
                      {type === 'SUBSCRIPTION' && 'Grant subscription access'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {(selectedRewardType === 'USD' || selectedRewardType === 'USDC') && (
              <>
                <div>
                  <label htmlFor="reward_amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Reward Amount ({selectedRewardType}) *
                  </label>
                  <input
                    type="number"
                    id="reward_amount"
                    min="2"
                    step="0.01"
                    {...register('reward_amount', {
                      required: 'Reward amount is required',
                      min: { value: 2, message: 'Minimum reward is $2' },
                      validate: validateRewardAmount,
                    })}
                    className="form-input"
                    placeholder="100.00"
                    onChange={(e) => trigger('reward_amount')}
                  />
                  {errors.reward_amount && (
                    <p className="mt-1 text-sm text-danger">{errors.reward_amount.message}</p>
                  )}
                </div>

                {/* Fee Buyout Option */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="buyout_fee"
                      checked={buyoutFeePaid}
                      onChange={(e) => setBuyoutFeePaid(e.target.checked)}
                      className="mt-1 h-4 w-4 text-whop-purple border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <label htmlFor="buyout_fee" className="text-sm font-medium text-yellow-800">
                        Buy out the 10% platform fee for {formatCurrency(BUYOUT_FEE_AMOUNT)}
                      </label>
                      <p className="text-sm text-yellow-700 mt-1">
                        Pay a one-time fee to avoid the 10% platform commission. You'll keep the full reward amount.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fee Breakdown Display */}
                {feeCalculation && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Fee Breakdown</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{getFeeBreakdownText(feeCalculation)}</p>
                      <div className="pt-2 border-t border-gray-300 font-medium text-gray-900">
                        Total Cost: {formatCurrency(feeCalculation.totalCost)}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedRewardType === 'SUBSCRIPTION' && (
              <div>
                <label htmlFor="reward_subscription_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Plan ID *
                </label>
                <input
                  type="text"
                  id="reward_subscription_id"
                  {...register('reward_subscription_id', {
                    required: selectedRewardType === 'SUBSCRIPTION' ? 'Subscription plan ID is required' : false,
                  })}
                  className="form-input"
                  placeholder="Enter Whop plan ID..."
                />
                {errors.reward_subscription_id && (
                  <p className="mt-1 text-sm text-danger">{errors.reward_subscription_id.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Visibility Settings */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Visibility Settings
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Challenge Visibility *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['PUBLIC', 'PRIVATE'] as const).map((visibility) => (
                  <button
                    key={visibility}
                    type="button"
                    onClick={() => setSelectedVisibility(visibility)}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedVisibility === visibility
                        ? 'border-whop-purple bg-whop-purple/5 text-whop-purple'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      {visibility === 'PUBLIC' ? (
                        <Eye className="w-4 h-4 mr-2" />
                      ) : (
                        <EyeOff className="w-4 h-4 mr-2" />
                      )}
                      <span className="font-semibold">{visibility}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {visibility === 'PUBLIC' && 'Visible to all Whop users'}
                      {visibility === 'PRIVATE' && 'Only visible to your customers'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedVisibility === 'PRIVATE' && (
              <div>
                <label htmlFor="whop_company_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Whop Company ID *
                </label>
                <input
                  type="text"
                  id="whop_company_id"
                  {...register('whop_company_id', {
                    required: selectedVisibility === 'PRIVATE' ? 'Company ID is required for private challenges' : false,
                  })}
                  className="form-input"
                  placeholder="Enter your Whop company ID..."
                />
                {errors.whop_company_id && (
                  <p className="mt-1 text-sm text-danger">{errors.whop_company_id.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Funding Required
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    Your challenge will be created as a draft and must be funded before it goes live. 
                    You'll be redirected to complete the funding process after creation.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => window.history.back()}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary btn-lg"
              >
                {isLoading ? 'Creating...' : 'Create Challenge'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 