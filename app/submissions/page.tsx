'use client';

// Prevent prerendering - this page uses dynamic client functionality
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { ExternalLink, Clock, CheckCircle, XCircle, DollarSign, AlertCircle } from 'lucide-react';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';

interface SubmissionWithChallenge {
  id: string;
  contentUrl: string;
  contentType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  paidAt?: string;
  challenge: {
    id: string;
    title: string;
    description: string;
    reward_amount?: number;
    reward_type: 'USD' | 'USDC' | 'SUBSCRIPTION';
    deadline: string;
    creator: {
      id: string;
      username: string;
      avatarUrl?: string;
    };
  };
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
  }>;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionWithChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'>('ALL');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch('/api/submissions');
      if (!response.ok) {
        // Check if it's an auth error vs other error
        if (response.status === 401) {
          console.log('User not authenticated - this is normal during development');
          setSubmissions([]);
          return;
        }
        throw new Error('Failed to fetch submissions');
      }
      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (err) {
      console.error('Submissions fetch error:', err);
      // Don't show error for empty submissions - just show empty state
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    if (filter === 'ALL') return true;
    return submission.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'PAID':
        return <DollarSign className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getContentTypeLabel = (contentType: string) => {
    switch (contentType.toUpperCase()) {
      case 'TIKTOK':
        return 'TikTok';
      case 'TWITTER':
        return 'Twitter/X';
      case 'INSTAGRAM':
        return 'Instagram';
      case 'YOUTUBE':
        return 'YouTube';
      default:
        return 'Other';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-6 mb-4">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Submissions</h1>
          <p className="mt-2 text-gray-600">
            Track your content submissions and their status across all challenges.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-whop-purple text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status === 'ALL' ? 'All' : status}
                <span className="ml-2 text-xs">
                  ({status === 'ALL' 
                    ? submissions.length 
                    : submissions.filter(s => s.status === status).length
                  })
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <XCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {filter === 'ALL' ? 'No submissions yet' : `No ${filter.toLowerCase()} submissions`}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'ALL' 
                ? 'Start by submitting content to active challenges.'
                : `You don't have any ${filter.toLowerCase()} submissions.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSubmissions.map((submission) => (
              <div key={submission.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Challenge Info */}
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {submission.challenge.title}
                      </h3>
                      <div className={`status-badge ${getStatusColor(submission.status)}`}>
                        {submission.status}
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {submission.challenge.description}
                    </p>

                    {/* Creator Info */}
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-sm text-gray-500">by</span>
                      {submission.challenge.creator.avatarUrl ? (
                        <img
                          src={submission.challenge.creator.avatarUrl}
                          alt={submission.challenge.creator.username}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-whop-purple flex items-center justify-center">
                          <span className="text-xs text-white font-medium">
                            {submission.challenge.creator.username[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {submission.challenge.creator.username}
                      </span>
                    </div>

                    {/* Submission Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Submitted</span>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(submission.submittedAt)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Platform</span>
                        <p className="text-sm font-medium text-gray-900">
                          {getContentTypeLabel(submission.contentType)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Reward</span>
                        <p className="text-sm font-medium text-gray-900">
                                                      {submission.challenge.reward_amount
                              ? formatCurrency(submission.challenge.reward_amount)
                            : 'Subscription Pass'
                          } ({submission.challenge.reward_type})
                        </p>
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    {submission.status === 'REJECTED' && submission.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-red-800">
                          <strong>Rejection Reason:</strong> {submission.rejectionReason}
                        </p>
                      </div>
                    )}

                    {/* Payment Info */}
                    {submission.status === 'PAID' && submission.payments.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-green-800">
                          <strong>Payment:</strong> {formatCurrency(submission.payments[0].amount)} {submission.payments[0].currency} - {submission.payments[0].status}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status Icon & Actions */}
                  <div className="flex flex-col items-end space-y-3">
                    {getStatusIcon(submission.status)}
                    
                    <a
                      href={submission.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm flex items-center"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Content
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 