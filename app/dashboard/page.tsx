'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Users, 
  TrendingUp,
  Calendar,
  Filter
} from 'lucide-react';
import Link from 'next/link';

interface Challenge {
  id: string;
  title: string;
  description: string;
  rewardAmount?: number;
  rewardType: 'USD' | 'USDC' | 'SUBSCRIPTION';
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  isFunded: boolean;
  deadline: string;
  createdAt: string;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}

interface DashboardStats {
  totalChallenges: number;
  activeChallenges: number;
  totalSubmissions: number;
  pendingReviews: number;
  totalPaidOut: number;
  averageEngagement: number;
}

export default function DashboardPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'COMPLETED'>('ALL');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data for now - would fetch from real API
      const mockStats: DashboardStats = {
        totalChallenges: 8,
        activeChallenges: 3,
        totalSubmissions: 147,
        pendingReviews: 23,
        totalPaidOut: 2450.00,
        averageEngagement: 18.4,
      };

      const mockChallenges: Challenge[] = [
        {
          id: '1',
          title: 'Create TikTok Content for Brand Launch',
          description: 'Create engaging TikTok videos showcasing our new product line',
          rewardAmount: 500,
          rewardType: 'USD',
          status: 'ACTIVE',
          isFunded: true,
          deadline: '2024-02-15T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          totalSubmissions: 47,
          pendingSubmissions: 12,
          approvedSubmissions: 23,
          rejectedSubmissions: 12,
        },
        {
          id: '2',
          title: 'Instagram Stories Challenge',
          description: 'Create creative Instagram stories featuring our community',
          rewardAmount: 250,
          rewardType: 'USD',
          status: 'ACTIVE',
          isFunded: true,
          deadline: '2024-02-20T00:00:00Z',
          createdAt: '2024-01-05T00:00:00Z',
          totalSubmissions: 28,
          pendingSubmissions: 8,
          approvedSubmissions: 15,
          rejectedSubmissions: 5,
        },
        {
          id: '3',
          title: 'Twitter/X Engagement Campaign',
          description: 'Create viral Twitter content about our latest update',
          rewardAmount: 0,
          rewardType: 'SUBSCRIPTION',
          status: 'DRAFT',
          isFunded: false,
          deadline: '2024-03-01T00:00:00Z',
          createdAt: '2024-01-10T00:00:00Z',
          totalSubmissions: 0,
          pendingSubmissions: 0,
          approvedSubmissions: 0,
          rejectedSubmissions: 0,
        },
      ];

      setStats(mockStats);
      setChallenges(mockChallenges);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-700 bg-green-100';
      case 'DRAFT':
        return 'text-yellow-700 bg-yellow-100';
      case 'COMPLETED':
        return 'text-blue-700 bg-blue-100';
      case 'CANCELLED':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const filteredChallenges = challenges.filter(challenge => {
    if (filter === 'ALL') return true;
    return challenge.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Creator Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Manage your challenges, review submissions, and track performance.
              </p>
            </div>
            <Link
              href="/create-challenge"
              className="btn btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Challenge
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-whop-purple" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Challenges</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalChallenges}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="w-8 h-8 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Challenges</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeChallenges}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingReviews}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="w-8 h-8 text-yellow-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Paid Out</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalPaidOut)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Challenges Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Your Challenges</h2>
              
              {/* Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="form-input py-1 text-sm"
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredChallenges.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No challenges found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter === 'ALL' 
                    ? 'Get started by creating your first challenge.'
                    : `No ${filter.toLowerCase()} challenges found.`
                  }
                </p>
                {filter === 'ALL' && (
                  <div className="mt-6">
                    <Link href="/create-challenge" className="btn btn-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Challenge
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              filteredChallenges.map((challenge) => (
                <div key={challenge.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{challenge.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(challenge.status)}`}>
                          {challenge.status}
                        </span>
                        {!challenge.isFunded && challenge.status === 'DRAFT' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-orange-700 bg-orange-100">
                            Needs Funding
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">{challenge.description}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          {challenge.rewardAmount 
                            ? formatCurrency(challenge.rewardAmount)
                            : 'Subscription Pass'
                          }
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Due {formatDate(challenge.deadline)}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {challenge.totalSubmissions} submissions
                        </div>
                        {challenge.pendingSubmissions > 0 && (
                          <div className="flex items-center text-yellow-600">
                            <Clock className="w-4 h-4 mr-1" />
                            {challenge.pendingSubmissions} pending review
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/challenges/${challenge.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Link>
                      
                      {challenge.pendingSubmissions > 0 && (
                        <Link
                          href={`/challenges/${challenge.id}/review`}
                          className="btn btn-primary btn-sm"
                        >
                          Review ({challenge.pendingSubmissions})
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/create-challenge"
            className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <Plus className="w-8 h-8 text-whop-purple mr-4" />
              <div>
                <h3 className="font-medium text-gray-900">Create New Challenge</h3>
                <p className="text-sm text-gray-600 mt-1">Launch a new content challenge</p>
              </div>
            </div>
          </Link>

          <Link
            href="/challenges?filter=pending"
            className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-500 mr-4" />
              <div>
                <h3 className="font-medium text-gray-900">Review Submissions</h3>
                <p className="text-sm text-gray-600 mt-1">Check pending content submissions</p>
              </div>
            </div>
          </Link>

          <Link
            href="/analytics"
            className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-500 mr-4" />
              <div>
                <h3 className="font-medium text-gray-900">View Analytics</h3>
                <p className="text-sm text-gray-600 mt-1">Track performance and engagement</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
} 