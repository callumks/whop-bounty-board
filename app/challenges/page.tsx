'use client';

// Prevent prerendering - this page uses dynamic client functionality
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Search, Filter, Clock, Users, DollarSign } from 'lucide-react';
import { formatCurrency, getTimeRemaining, getStatusColor } from '@/lib/utils';

interface Challenge {
  id: string;
  title: string;
  description: string;
  requiredTags: string[];
  rewardType: 'USD' | 'USDC' | 'SUBSCRIPTION';
  rewardAmount: number;
  deadline: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  status: string;
  isFunded: boolean;
  totalSubmissions: number;
  approvedSubmissions: number;
  creator: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  _count?: {
    submissions: number;
  };
}

interface ChallengesData {
  challenges: Challenge[];
  total: number;
  page: number;
  totalPages: number;
}

export default function ChallengesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = use(props.searchParams);
  const [challengesData, setChallengesData] = useState<ChallengesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [rewardTypeFilter, setRewardTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [userStatus, setUserStatus] = useState<{isCreator: boolean} | null>(null);

  useEffect(() => {
    fetchChallenges();
    fetchUserStatus();
  }, [searchQuery, rewardTypeFilter, sortBy]);

  const fetchUserStatus = async () => {
    try {
      const response = await fetch('/api/user/status');
      if (response.ok) {
        const data = await response.json();
        setUserStatus({ isCreator: data.user?.is_whop_owner || false });
      }
    } catch (error) {
      console.log('Could not fetch user status');
    }
  };

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('search', searchQuery);
      if (rewardTypeFilter) params.append('reward_type', rewardTypeFilter);
      if (sortBy) params.append('sort', sortBy);
      
      const response = await fetch(`/api/challenges?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch challenges');
      }
      
      const data = await response.json();
      setChallengesData(data);
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
      // Fallback to mock data for development
      setChallengesData({
        challenges: [],
        total: 0,
        page: 1,
        totalPages: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchChallenges();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whop-purple mx-auto mb-4"></div>
          <p className="text-gray-600">Loading challenges...</p>
        </div>
      </div>
    );
  }

  const { challenges, total, page, totalPages } = challengesData || { challenges: [], total: 0, page: 1, totalPages: 1 };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Browse Challenges</h1>
          <p className="text-xl text-gray-600">
            Discover active challenges and earn rewards for your creativity
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search challenges..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <select 
                value={rewardTypeFilter}
                onChange={(e) => setRewardTypeFilter(e.target.value)}
                className="form-select"
              >
                <option value="">All Reward Types</option>
                <option value="USD">USD</option>
                <option value="USDC">USDC</option>
                <option value="SUBSCRIPTION">Subscription Pass</option>
              </select>

              <select className="form-select">
                <option value="">All Categories</option>
                <option value="social">Social Media</option>
                <option value="art">Art & Design</option>
                <option value="video">Video Content</option>
                <option value="fitness">Fitness</option>
              </select>

              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-select"
              >
                <option value="newest">Newest First</option>
                <option value="deadline">Ending Soon</option>
                <option value="reward">Highest Reward</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </form>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-600">
            Showing {challenges.length} of {total} challenges
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Active & funded challenges only</span>
          </div>
        </div>

        {/* Empty State */}
        {challenges.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery 
                ? `No challenges match "${searchQuery}". Try adjusting your search or filters.`
                : 'No active challenges available at the moment. Check back soon!'
              }
            </p>
            {userStatus?.isCreator && (
              <Link href="/create-challenge" className="btn btn-primary">
                Create a Challenge
              </Link>
            )}
          </div>
        )}

        {/* Challenges Grid */}
        {challenges.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="card hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-whop-purple rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {challenge.creator.username[0]}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {challenge.creator.username}
                      </div>
                      <div className="text-sm text-gray-500">
                        {challenge.visibility === 'PRIVATE' ? 'Private Challenge' : 'Public Challenge'}
                      </div>
                    </div>
                  </div>
                  <div className={`status-badge ${
                    challenge.rewardType === 'USD' ? 'text-success bg-success/10' :
                    challenge.rewardType === 'USDC' ? 'text-whop-blue bg-whop-blue/10' :
                    'text-whop-purple bg-whop-purple/10'
                  }`}>
                    {challenge.rewardType === 'SUBSCRIPTION' ? 'PASS' : challenge.rewardType}
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3">{challenge.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-3">{challenge.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {challenge.requiredTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                    </div>
                    <div className="font-semibold text-gray-900">
                      {challenge.rewardAmount
                        ? formatCurrency(challenge.rewardAmount)
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
                      {challenge._count?.submissions || challenge.totalSubmissions || 0}
                    </div>
                    <div className="text-xs text-gray-500">Submissions</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Clock className="w-4 h-4 text-gray-400 mr-1" />
                    </div>
                    <div className="font-semibold text-gray-900">
                      {getTimeRemaining(challenge.deadline)}
                    </div>
                    <div className="text-xs text-gray-500">Remaining</div>
                  </div>
                </div>

                {/* Action */}
                <Link
                  href={`/challenges/${challenge.id}`}
                  className="btn btn-primary w-full"
                >
                  View Challenge
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2">
            <button className="btn btn-secondary btn-sm" disabled={page === 1}>
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-secondary btn-sm" disabled={page === totalPages}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 