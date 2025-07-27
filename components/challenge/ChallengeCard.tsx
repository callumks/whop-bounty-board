'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Users, DollarSign, Eye, EyeOff } from 'lucide-react';
import { ChallengeWithCreator } from '@/lib/types';
import { formatCurrency, getTimeRemaining, getStatusColor } from '@/lib/utils';

interface ChallengeCardProps {
  challenge: ChallengeWithCreator;
  showStatus?: boolean;
  className?: string;
}

export default function ChallengeCard({ 
  challenge, 
  showStatus = false, 
  className = '' 
}: ChallengeCardProps) {
  const isExpired = new Date(challenge.deadline) < new Date();
  
  return (
    <div className={`card hover:shadow-lg transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-whop-purple rounded-full flex items-center justify-center">
                      {challenge.creator.avatarUrl ? (
            <img
              src={challenge.creator.avatarUrl}
                alt={challenge.creator.username}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold">
                {challenge.creator.username[0].toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              {challenge.creator.username}
            </div>
            <div className="text-sm text-gray-500 flex items-center">
              {challenge.visibility === 'PRIVATE' ? (
                <>
                  <EyeOff className="w-3 h-3 mr-1" />
                  Private Challenge
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 mr-1" />
                  Public Challenge
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          <div className={`status-badge ${
            challenge.reward_type === 'USD' ? 'text-success bg-success/10' :
            challenge.reward_type === 'USDC' ? 'text-whop-blue bg-whop-blue/10' :
            'text-whop-purple bg-whop-purple/10'
          }`}>
            {challenge.reward_type === 'SUBSCRIPTION' ? 'PASS' : challenge.reward_type}
          </div>
          
          {showStatus && (
            <div className={`status-badge ${getStatusColor(challenge.status)}`}>
              {challenge.status}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold mb-3 text-gray-900">
        {challenge.title}
      </h3>
      
      <p className="text-gray-600 mb-4 line-clamp-3">
        {challenge.description}
      </p>

      {/* Tags */}
      {challenge.required_tags && challenge.required_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {challenge.required_tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
            >
              {tag}
            </span>
          ))}
          {challenge.required_tags.length > 3 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              +{challenge.required_tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div>
          <div className="flex items-center justify-center mb-1">
            <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
          </div>
          <div className="font-semibold text-gray-900">
            {challenge.reward_amount 
              ? formatCurrency(challenge.reward_amount)
              : 'Subscription'
            }
          </div>
          <div className="text-xs text-gray-500">Reward</div>
        </div>
        
        <div>
          <div className="flex items-center justify-center mb-1">
            <Users className="w-4 h-4 text-gray-400 mr-1" />
          </div>
          <div className="font-semibold text-gray-900">
            {challenge.total_submissions}
          </div>
          <div className="text-xs text-gray-500">Submissions</div>
        </div>
        
        <div>
          <div className="flex items-center justify-center mb-1">
            <Clock className="w-4 h-4 text-gray-400 mr-1" />
          </div>
          <div className={`font-semibold ${isExpired ? 'text-danger' : 'text-gray-900'}`}>
            {getTimeRemaining(challenge.deadline)}
          </div>
          <div className="text-xs text-gray-500">Remaining</div>
        </div>
      </div>

      {/* Progress Bar */}
      {challenge.total_submissions > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Submissions</span>
            <span>{challenge.approved_submissions} approved</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-whop-purple h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min((challenge.approved_submissions / challenge.total_submissions) * 100, 100)}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Action */}
      <Link
        href={`/challenges/${challenge.id}`}
        className={`btn w-full ${
          isExpired 
            ? 'btn-secondary cursor-not-allowed opacity-50' 
            : 'btn-primary'
        }`}
      >
        {isExpired ? 'Challenge Ended' : 'View Challenge'}
      </Link>
    </div>
  );
} 