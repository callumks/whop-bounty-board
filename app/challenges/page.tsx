import React from 'react';
import Link from 'next/link';
import { Search, Filter, Clock, Users, DollarSign } from 'lucide-react';

import { formatCurrency, getTimeRemaining, getStatusColor } from '@/lib/utils';

// This would normally fetch from your API with filters
async function getChallenges(searchParams: any) {
  // Mock data for now
  return {
    challenges: [
      {
        id: '1',
        title: 'TikTok Dance Challenge',
        description: 'Create an original dance to our latest track and post it on TikTok with the required hashtags. Show off your creativity and win cash prizes!',
        reward_type: 'USD',
        reward_amount: 500,
        deadline: '2024-01-31T23:59:59Z',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        creator: { 
          id: '1',
          username: 'MusicLabel', 
          avatar_url: null 
        },
        total_submissions: 47,
        approved_submissions: 23,
        required_tags: ['@MusicLabel', '#DanceChallenge'],
      },
      {
        id: '2',
        title: 'Product Review Challenge',
        description: 'Create an honest review of our new wireless headphones. Post on Instagram or YouTube with your thoughts and experience.',
        reward_type: 'SUBSCRIPTION',
        reward_amount: null,
        deadline: '2024-02-15T23:59:59Z',
        visibility: 'PRIVATE',
        status: 'ACTIVE',
        creator: { 
          id: '2',
          username: 'TechBrand', 
          avatar_url: null 
        },
        total_submissions: 23,
        approved_submissions: 15,
        required_tags: ['@TechBrand', '#ProductReview'],
      },
      {
        id: '3',
        title: 'Crypto Art Challenge',
        description: 'Design original digital artwork featuring our mascot character. Submit your best NFT-ready art and earn USDC rewards.',
        reward_type: 'USDC',
        reward_amount: 200,
        deadline: '2024-02-28T23:59:59Z',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        creator: { 
          id: '3',
          username: 'CryptoStudio', 
          avatar_url: null 
        },
        total_submissions: 15,
        approved_submissions: 8,
        required_tags: ['@CryptoStudio', '#NFTArt'],
      },
      {
        id: '4',
        title: 'Fitness Transformation',
        description: 'Document your 30-day fitness journey using our program. Share before/after photos and weekly progress updates.',
        reward_type: 'USD',
        reward_amount: 1000,
        deadline: '2024-03-15T23:59:59Z',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        creator: { 
          id: '4',
          username: 'FitnessGuru', 
          avatar_url: null 
        },
        total_submissions: 31,
        approved_submissions: 12,
        required_tags: ['@FitnessGuru', '#Transformation'],
      },
    ],
    total: 4,
    page: 1,
    totalPages: 1,
  };
}

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const data = await getChallenges(searchParams);
  const { challenges, total, page, totalPages } = data;

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
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search challenges..."
                  className="form-input pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <select className="form-select">
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

              <select className="form-select">
                <option value="newest">Newest First</option>
                <option value="deadline">Ending Soon</option>
                <option value="reward">Highest Reward</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-600">
            Showing {challenges.length} of {total} challenges
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Active challenges only</span>
          </div>
        </div>

        {/* Challenges Grid */}
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
                  challenge.reward_type === 'USD' ? 'text-success bg-success/10' :
                  challenge.reward_type === 'USDC' ? 'text-whop-blue bg-whop-blue/10' :
                  'text-whop-purple bg-whop-purple/10'
                }`}>
                  {challenge.reward_type === 'SUBSCRIPTION' ? 'PASS' : challenge.reward_type}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-3">{challenge.title}</h3>
              <p className="text-gray-600 mb-4 line-clamp-3">{challenge.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {challenge.required_tags.map((tag, index) => (
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