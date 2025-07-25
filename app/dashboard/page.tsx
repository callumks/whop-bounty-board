'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, DollarSign, Users, Clock, AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import { formatCurrency, getTimeRemaining } from '@/lib/utils';

interface Challenge {
  id: string;
  title: string;
  description: string;
  rewardType: 'USD' | 'USDC' | 'SUBSCRIPTION';
  rewardAmount: number;
  deadline: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  isFunded: boolean;
  totalSubmissions: number;
  approvedSubmissions: number;
  createdAt: string;
}

export default function DashboardPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const response = await fetch('/api/user/challenges');
      if (!response.ok) {
        throw new Error('Failed to fetch challenges');
      }
      const data = await response.json();
      setChallenges(data.challenges || []);
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
      // Fallback to empty array on error
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredChallenges = challenges.filter(challenge => {
    switch (activeTab) {
      case 'draft':
        return challenge.status === 'DRAFT';
      case 'active':
        return challenge.status === 'ACTIVE';
      case 'completed':
        return challenge.status === 'COMPLETED';
      default:
        return true;
    }
  });

  const getStatusIcon = (challenge: Challenge) => {
    if (challenge.status === 'DRAFT') {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    } else if (challenge.status === 'ACTIVE') {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    return <Clock className="w-5 h-5 text-gray-500" />;
  };

  const getStatusText = (challenge: Challenge) => {
    if (challenge.status === 'DRAFT') {
      return 'Pending Funding';
    } else if (challenge.status === 'ACTIVE') {
      return 'Live & Active';
    }
    return challenge.status;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whop-purple mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your challenges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Creator Dashboard</h1>
              <p className="text-gray-600">
                Manage your challenges, track performance, and engage with your community
              </p>
            </div>
            <Link
              href="/create-challenge"
              className="btn btn-primary flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Challenge
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-whop-purple/10 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-whop-purple" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Challenges</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {challenges.filter(c => c.status === 'ACTIVE').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Needs Funding</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {challenges.filter(c => c.status === 'DRAFT').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Submissions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {challenges.reduce((sum, c) => sum + c.totalSubmissions, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rewards Paid</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(
                    challenges
                      .filter(c => c.status === 'ACTIVE' || c.status === 'COMPLETED')
                      .reduce((sum, c) => sum + (c.rewardAmount * c.approvedSubmissions), 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {[
                { key: 'all', label: 'All Challenges', count: challenges.length },
                { key: 'draft', label: 'Needs Funding', count: challenges.filter(c => c.status === 'DRAFT').length },
                { key: 'active', label: 'Active', count: challenges.filter(c => c.status === 'ACTIVE').length },
                { key: 'completed', label: 'Completed', count: challenges.filter(c => c.status === 'COMPLETED').length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-whop-purple text-whop-purple'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>

          {/* Challenge List */}
          <div className="p-6">
            {filteredChallenges.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges found</h3>
                <p className="text-gray-500 mb-6">
                  {activeTab === 'all' 
                    ? "You haven't created any challenges yet."
                    : `No ${activeTab} challenges found.`
                  }
                </p>
                {activeTab === 'all' && (
                  <Link href="/create-challenge" className="btn btn-primary">
                    Create Your First Challenge
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredChallenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {getStatusIcon(challenge)}
                          <span className="ml-2 text-sm font-medium text-gray-600">
                            {getStatusText(challenge)}
                          </span>
                          <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                            challenge.rewardType === 'USD' ? 'bg-green-100 text-green-800' :
                            challenge.rewardType === 'USDC' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {challenge.rewardType === 'SUBSCRIPTION' ? 'PASS' : challenge.rewardType}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {challenge.title}
                        </h3>
                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {challenge.description}
                        </p>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Reward:</span>
                            <span className="ml-1 font-medium">
                              {challenge.rewardType === 'SUBSCRIPTION' 
                                ? 'Subscription Access' 
                                : formatCurrency(challenge.rewardAmount)
                              }
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Submissions:</span>
                            <span className="ml-1 font-medium">{challenge.totalSubmissions}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Deadline:</span>
                            <span className="ml-1 font-medium">{getTimeRemaining(challenge.deadline)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-6 flex flex-col space-y-2">
                        {challenge.status === 'DRAFT' ? (
                          <Link
                            href={`/challenges/${challenge.id}/fund`}
                            className="btn btn-primary btn-sm flex items-center"
                          >
                            <Wallet className="w-4 h-4 mr-1" />
                            Fund Challenge
                          </Link>
                        ) : (
                          <Link
                            href={`/challenges/${challenge.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            View Challenge
                          </Link>
                        )}
                        
                        {challenge.status === 'ACTIVE' && (
                          <Link
                            href={`/challenges/${challenge.id}/submissions`}
                            className="btn btn-outline btn-sm"
                          >
                            Review Submissions
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 