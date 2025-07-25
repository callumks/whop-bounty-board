import React from 'react';
import Link from 'next/link';
import { ArrowRight, Trophy, DollarSign, Users } from 'lucide-react';


// This would normally fetch from your API
async function getFeaturedChallenges() {
  // Mock data for now
  return [
    {
      id: '1',
      title: 'TikTok Dance Challenge',
      description: 'Create an original dance to our latest track',
      reward_type: 'USD',
      reward_amount: 500,
      deadline: '2024-01-31T23:59:59Z',
      creator: { username: 'MusicLabel', avatar_url: null },
      total_submissions: 47,
    },
    {
      id: '2',
      title: 'Product Review Challenge',
      description: 'Review our new product on Instagram',
      reward_type: 'SUBSCRIPTION',
      reward_amount: null,
      deadline: '2024-02-15T23:59:59Z',
      creator: { username: 'TechBrand', avatar_url: null },
      total_submissions: 23,
    },
    {
      id: '3',
      title: 'Crypto Art Challenge',
      description: 'Create digital art featuring our mascot',
      reward_type: 'USDC',
      reward_amount: 200,
      deadline: '2024-02-28T23:59:59Z',
      creator: { username: 'CryptoStudio', avatar_url: null },
      total_submissions: 15,
    },
  ];
}

export default async function HomePage() {
  const featuredChallenges = await getFeaturedChallenges();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Launch Challenges,
              <br />
              <span className="text-blue-200">Reward Creators</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Challenges connects Whop creators with their communities through 
              user-generated content challenges. Reward participants with USD, USDC, 
              or subscription passes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/challenges" className="btn btn-lg bg-white text-whop-purple hover:bg-gray-100">
                Browse Challenges
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link href="/challenges" className="btn btn-lg border-2 border-white text-white hover:bg-white hover:text-whop-purple">
                Explore Challenges
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Challenges?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built specifically for Whop creators to engage their communities 
              and drive user-generated content.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Multiple Reward Types</h3>
              <p className="text-gray-600">
                Reward winners with USD via Stripe, USDC crypto payments, 
                or unlock subscription passes automatically.
              </p>
            </div>

            <div className="text-center p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Funding Gates</h3>
              <p className="text-gray-600">
                Challenges must be fully funded before going live. 
                No challenges without rewards - guaranteed payouts.
              </p>
            </div>

            <div className="text-center p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Whop Integration</h3>
              <p className="text-gray-600">
                Seamlessly integrated with Whop for authentication, 
                user gating, and subscription management.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Challenges */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Featured Challenges
              </h2>
              <p className="text-xl text-gray-600">
                Join these popular challenges and earn rewards
              </p>
            </div>
            <Link href="/challenges" className="btn btn-primary">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredChallenges.map((challenge) => (
              <div key={challenge.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-whop-purple rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {challenge.creator.username[0]}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {challenge.creator.username}
                      </div>
                      <div className="text-sm text-gray-500">Creator</div>
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

                <h3 className="text-xl font-semibold mb-2">{challenge.title}</h3>
                <p className="text-gray-600 mb-4">{challenge.description}</p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{challenge.total_submissions} submissions</span>
                  <span>
                    {challenge.reward_amount 
                      ? `$${challenge.reward_amount}` 
                      : 'Subscription Pass'
                    }
                  </span>
                </div>

                <Link
                  href={`/challenges/${challenge.id}`}
                  className="btn btn-primary w-full"
                >
                  View Challenge
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Launch Your First Challenge?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Connect with your Whop community and drive engagement through 
            rewarded user-generated content challenges.
          </p>
          <Link href="/challenges" className="btn btn-primary btn-lg">
            Start Participating
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
} 