'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, Users, DollarSign, Eye, EyeOff, Tag, Calendar, ExternalLink } from 'lucide-react';
import { ChallengeWithCreator } from '@/lib/types';
import { formatCurrency, getTimeRemaining, getStatusColor } from '@/lib/utils';

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;
  
  const [challenge, setChallenge] = useState<ChallengeWithCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchChallenge();
  }, [challengeId]);

  const fetchChallenge = async () => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}`);
      
      if (!response.ok) {
        throw new Error('Challenge not found');
      }
      
      const data = await response.json();
      setChallenge(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!submissionUrl.trim()) {
      alert('Please enter a content URL');
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          contentUrl: submissionUrl.trim(),
          contentType: 'OTHER', // Default type, can be enhanced later
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit');
      }

      alert('Submission successful!');
      setSubmissionUrl('');
      await fetchChallenge(); // Refresh challenge data
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Challenge Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This challenge does not exist or is not available.'}</p>
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

  const isExpired = new Date(challenge.deadline) < new Date();
  const canSubmit = challenge.status === 'ACTIVE' && !isExpired;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-whop-purple rounded-full flex items-center justify-center">
              {challenge.creator.avatarUrl ? (
                <img
                  src={challenge.creator.avatarUrl}
                  alt={challenge.creator.username}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-xl">
                  {challenge.creator.username[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{challenge.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>by <strong>{challenge.creator.username}</strong></span>
                <div className="flex items-center">
                  {challenge.visibility === 'PRIVATE' ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-1" />
                      Private Challenge
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-1" />
                      Public Challenge
                    </>
                  )}
                </div>
                <div className={`status-badge ${getStatusColor(challenge.status)}`}>
                  {challenge.status}
                </div>
              </div>
            </div>
          </div>
          
          <div className={`status-badge text-lg px-4 py-2 ${
            challenge.rewardType === 'USD' ? 'text-success bg-success/10' :
            challenge.rewardType === 'USDC' ? 'text-whop-blue bg-whop-blue/10' :
            'text-whop-purple bg-whop-purple/10'
          }`}>
            {challenge.rewardType === 'SUBSCRIPTION' ? 'SUBSCRIPTION PASS' : challenge.rewardType}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <DollarSign className="w-8 h-8 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {challenge.rewardAmount 
                ? formatCurrency(challenge.rewardAmount)
                : 'Subscription'
              }
            </div>
            <div className="text-sm text-gray-500">Reward</div>
          </div>
          
          <div className="card text-center">
            <Users className="w-8 h-8 text-whop-blue mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{challenge.totalSubmissions}</div>
            <div className="text-sm text-gray-500">Total Submissions</div>
          </div>
          
          <div className="card text-center">
            <Users className="w-8 h-8 text-whop-purple mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{challenge.approvedSubmissions}</div>
            <div className="text-sm text-gray-500">Approved Submissions</div>
          </div>
          
          <div className="card text-center">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <div className={`text-2xl font-bold ${isExpired ? 'text-danger' : 'text-gray-900'}`}>
              {getTimeRemaining(challenge.deadline)}
            </div>
            <div className="text-sm text-gray-500">Time Remaining</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Description */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Challenge Description</h2>
            <div className="prose max-w-none text-gray-700">
              {challenge.description.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-3">{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Required Tags */}
          {challenge.requiredTags && challenge.requiredTags.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                Required Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {challenge.requiredTags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-whop-purple/10 text-whop-purple"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Submission Form */}
          {canSubmit && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Submit Your Content</h2>
              <form onSubmit={handleSubmission}>
                <div className="mb-4">
                  <label htmlFor="contentUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Content URL *
                  </label>
                  <input
                    type="url"
                    id="contentUrl"
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                    placeholder="https://twitter.com/username/status/123... or https://tiktok.com/@username/video/123..."
                    className="form-input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste the URL of your content (TikTok, Twitter, Instagram, YouTube, etc.)
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary w-full"
                >
                  {submitting ? 'Submitting...' : 'Submit Content'}
                </button>
              </form>
            </div>
          )}

          {!canSubmit && (
            <div className="card">
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {isExpired ? 'Challenge Ended' : 'Challenge Not Active'}
                </h3>
                <p className="text-gray-600">
                  {isExpired 
                    ? 'This challenge has ended and is no longer accepting submissions.'
                    : 'This challenge is not yet active. Check back later!'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Challenge Info */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Challenge Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span className="font-medium">
                  {new Date(challenge.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Deadline:</span>
                <span className="font-medium">
                  {new Date(challenge.deadline).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`font-medium ${getStatusColor(challenge.status)}`}>
                  {challenge.status}
                </span>
              </div>
              {challenge.rewardAmount && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform Fee:</span>
                  <span className="font-medium">
                    {formatCurrency(challenge.platformFee)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Submission Guidelines */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Submission Guidelines</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Content must be original and created by you</li>
              <li>• Include all required tags in your content</li>
              <li>• Follow platform community guidelines</li>
              <li>• Ensure your content URL is publicly accessible</li>
              <li>• Only one submission per user allowed</li>
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/challenges')}
                className="btn btn-secondary w-full"
              >
                Browse Other Challenges
              </button>
              <button
                onClick={() => router.push('/submissions')}
                className="btn btn-outline w-full"
              >
                View My Submissions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 