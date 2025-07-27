'use client';

// Prevent prerendering - this page uses dynamic client functionality
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { User, Award, TrendingUp, Calendar, Settings, ExternalLink } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  isCreator: boolean;
  joinedAt: string;
  stats: {
    challengesCreated: number;
    totalSubmissions: number;
    approvedSubmissions: number;
    totalEarnings: number;
    totalPaid: number;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        // Check if it's an auth error vs other error
        if (response.status === 401) {
          setError('Please access this app through Whop to view your profile');
          return;
        }
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setProfile(data.profile);
    } catch (err) {
      setError('Failed to load profile - please try refreshing or contact support');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg p-6 mb-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'Profile not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings and view your ChallengeHub activity.
          </p>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-4">
                          {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                alt={profile.username}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-whop-purple flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{profile.username}</h2>
              <p className="text-gray-600">{profile.email}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  profile.isCreator 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {profile.isCreator ? 'Creator' : 'Participant'}
                </span>
                <span className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  Joined {formatDate(profile.joinedAt)}
                </span>
              </div>
            </div>


          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {profile.isCreator && (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="w-8 h-8 text-whop-purple" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Challenges Created</p>
                    <p className="text-2xl font-bold text-gray-900">{profile.stats.challengesCreated}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 font-bold">$</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Paid Out</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(profile.stats.totalPaid)}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Award className="w-8 h-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{profile.stats.totalSubmissions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 font-bold">$</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(profile.stats.totalEarnings)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Whop Integration Info */}
        <div className="bg-whop-purple/5 border border-whop-purple/20 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Whop Integration</h3>
          <p className="text-gray-600 mb-4">
            Your ChallengeHub account is connected to your Whop profile. Changes to your Whop username 
            and avatar will automatically sync to ChallengeHub.
          </p>
          <a
            href="https://whop.com/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-whop-purple hover:text-whop-purple/80 font-medium"
          >
            Manage Whop Settings
            <ExternalLink className="w-4 h-4 ml-1" />
          </a>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/submissions"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h4 className="font-medium text-gray-900">View My Submissions</h4>
              <p className="text-sm text-gray-600 mt-1">
                Track the status of your content submissions
              </p>
            </a>

            {/* Note: Challenge creation moved to dedicated creator section */}

            <a
              href="/challenges"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h4 className="font-medium text-gray-900">Browse Challenges</h4>
              <p className="text-sm text-gray-600 mt-1">
                Discover active challenges to participate in
              </p>
            </a>

            {profile.isCreator && (
              <a
                href="/dashboard"
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <h4 className="font-medium text-gray-900">Creator Dashboard</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your challenges and review submissions
                </p>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 