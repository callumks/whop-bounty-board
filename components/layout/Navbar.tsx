'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Plus, User, LogOut } from 'lucide-react';

interface NavbarProps {
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
    is_creator: boolean;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main nav */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-2xl font-bold gradient-bg bg-clip-text text-transparent">
                ChallengeHub
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/challenges"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Browse Challenges
              </Link>
              
              {user?.is_creator && (
                <Link
                  href="/dashboard"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Creator Dashboard
                </Link>
              )}
              
              <Link
                href="/submissions"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                My Submissions
              </Link>
            </div>
          </div>

          {/* Right side */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {user ? (
              <>
                {user.is_creator && (
                  <Link
                    href="/create-challenge"
                    className="btn btn-primary btn-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Challenge
                  </Link>
                )}
                
                {/* User menu */}
                <div className="relative">
                  <button
                    type="button"
                    className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-whop-purple focus:ring-offset-2"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  >
                    <span className="sr-only">Open user menu</span>
                    {user.avatar_url ? (
                      <img
                        className="h-8 w-8 rounded-full"
                        src={user.avatar_url}
                        alt={user.username}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-whop-purple flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>

                  {isUserMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-700 border-b">
                          <div className="font-medium">{user.username}</div>
                          <div className="text-xs text-gray-500">
                            {user.is_creator ? 'Creator' : 'User'}
                          </div>
                        </div>
                        
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Profile Settings
                        </Link>
                        
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            // Handle logout
                            window.location.href = '/api/auth/logout';
                          }}
                        >
                          <LogOut className="w-4 h-4 inline mr-2" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/api/auth/login"
                className="btn btn-primary btn-sm"
              >
                Sign in with Whop
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-whop-purple"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/challenges"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
            >
              Browse Challenges
            </Link>
            
            {user?.is_creator && (
              <Link
                href="/dashboard"
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
              >
                Creator Dashboard
              </Link>
            )}
            
            <Link
              href="/submissions"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
            >
              My Submissions
            </Link>
          </div>
          
          {user ? (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                {user.avatar_url ? (
                  <img
                    className="h-10 w-10 rounded-full"
                    src={user.avatar_url}
                    alt={user.username}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-whop-purple flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user.username}</div>
                  <div className="text-sm font-medium text-gray-500">
                    {user.is_creator ? 'Creator' : 'User'}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 space-y-1">
                {user.is_creator && (
                  <Link
                    href="/create-challenge"
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    Create Challenge
                  </Link>
                )}
                
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  Profile Settings
                </Link>
                
                <button
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    window.location.href = '/api/auth/logout';
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <Link
                href="/api/auth/login"
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                Sign in with Whop
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
} 