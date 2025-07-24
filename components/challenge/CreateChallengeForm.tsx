'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { DollarSign, Calendar, Tag, Eye, EyeOff } from 'lucide-react';
import { CreateChallengeData } from '@/lib/types';

interface CreateChallengeFormProps {
  onSubmit: (data: CreateChallengeData) => Promise<void>;
  isLoading?: boolean;
}

export default function CreateChallengeForm({ onSubmit, isLoading }: CreateChallengeFormProps) {
  const [selectedRewardType, setSelectedRewardType] = useState<'USD' | 'USDC' | 'SUBSCRIPTION'>('USD');
  const [selectedVisibility, setSelectedVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<CreateChallengeData>();

  const watchedTags = watch('required_tags') || [];

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

  const handleFormSubmit = async (data: CreateChallengeData) => {
    await onSubmit({
      ...data,
      reward_type: selectedRewardType,
      visibility: selectedVisibility,
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Create New Challenge</h1>
          <p className="text-gray-600">
            Launch a user-generated content challenge for your community. 
            Remember to fund your challenge before it goes live!
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

          {/* Reward Configuration */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Reward Configuration
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
              <div>
                <label htmlFor="reward_amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Reward Amount ({selectedRewardType}) *
                </label>
                <input
                  type="number"
                  id="reward_amount"
                  min="1"
                  step="0.01"
                  {...register('reward_amount', {
                    required: selectedRewardType !== 'SUBSCRIPTION' ? 'Reward amount is required' : false,
                    min: { value: 1, message: 'Minimum reward is $1' },
                  })}
                  className="form-input"
                  placeholder="100.00"
                />
                {errors.reward_amount && (
                  <p className="mt-1 text-sm text-danger">{errors.reward_amount.message}</p>
                )}
              </div>
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Funding Required
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Your challenge will be created as a draft and must be funded before it goes live. 
                    You'll be redirected to complete funding after creation.
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