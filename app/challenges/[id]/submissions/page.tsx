'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, ExternalLink, Clock, User } from 'lucide-react';

interface Submission {
  id: string;
  contentUrl: string;
  contentType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  rewardType: string;
  rewardAmount: number;
  status: string;
  creator: {
    id: string;
    username: string;
  };
}

export default function SubmissionsReviewPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;
  
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [challengeId]);

  const fetchData = async () => {
    try {
      const [challengeRes, submissionsRes] = await Promise.all([
        fetch(`/api/challenges/${challengeId}`),
        fetch(`/api/challenges/${challengeId}/submissions`)
      ]);

      if (challengeRes.ok) {
        const challengeData = await challengeRes.json();
        setChallenge(challengeData);
      }

      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json();
        setSubmissions(submissionsData.submissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (submissionId: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    try {
      setProcessing(submissionId);
      
      const response = await fetch(`/api/challenges/${challengeId}/submissions/${submissionId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to review submission');
      }

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Failed to review submission:', error);
      alert('Failed to review submission. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const getContentPreview = (submission: Submission) => {
    const url = submission.contentUrl;
    
    if (url.includes('tiktok.com')) return 'TikTok';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter/X';
    if (url.includes('instagram.com')) return 'Instagram';
    if (url.includes('youtube.com')) return 'YouTube';
    return 'Other Platform';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-100';
      case 'REJECTED': return 'text-red-600 bg-red-100';
      case 'PAID': return 'text-blue-600 bg-blue-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Challenge Not Found</h1>
          <button 
            onClick={() => router.push('/dashboard')}
            className="btn btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Submissions</h1>
            <p className="text-gray-600">
              Challenge: <span className="font-medium">{challenge.title}</span>
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn btn-secondary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Submissions List */}
      {submissions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
          <p className="text-gray-500">
            Submissions will appear here as users participate in your challenge.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* User Info */}
                  <div className="flex items-center mb-4">
                    {submission.user.avatarUrl ? (
                      <img
                        src={submission.user.avatarUrl}
                        alt={submission.user.username}
                        className="w-10 h-10 rounded-full object-cover mr-3"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-whop-purple rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-semibold">
                          {submission.user.username[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{submission.user.username}</h4>
                      <p className="text-sm text-gray-500">
                        Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Content Info */}
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 mr-2">Platform:</span>
                      <span className="text-sm text-gray-600">{getContentPreview(submission)}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 mr-2">Content:</span>
                      <a
                        href={submission.contentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-whop-purple hover:underline flex items-center"
                      >
                        View Content <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                      {submission.status}
                    </span>
                    {submission.rejectionReason && (
                      <p className="text-sm text-red-600 mt-2">
                        Rejection reason: {submission.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {submission.status === 'PENDING' && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleReview(submission.id, 'approve')}
                      disabled={processing === submission.id}
                      className="btn btn-sm bg-green-600 hover:bg-green-700 text-white flex items-center"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Rejection reason (optional):');
                        if (reason !== null) {
                          handleReview(submission.id, 'reject', reason || undefined);
                        }
                      }}
                      disabled={processing === submission.id}
                      className="btn btn-sm bg-red-600 hover:bg-red-700 text-white flex items-center"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}