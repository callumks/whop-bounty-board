import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

// Prevent prerendering - this route uses dynamic headers
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user with statistics
    const userWithStats = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        challenges: {
          select: {
            id: true,
            status: true,
            rewardAmount: true,
            rewardType: true,
          }
        },
        submissions: {
          select: {
            id: true,
            status: true,
            challenge: {
              select: {
                rewardAmount: true,
                rewardType: true,
              }
            },
            payments: {
              select: {
                amount: true,
                status: true,
              }
            }
          }
        },
        payments: {
          where: {
            status: 'COMPLETED',
            type: 'PAYOUT'
          },
          select: {
            amount: true,
          }
        }
      }
    });

    if (!userWithStats) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate statistics
    const challengesCreated = userWithStats.challenges.length;
    const totalSubmissions = userWithStats.submissions.length;
    const approvedSubmissions = userWithStats.submissions.filter((s: any) => s.status === 'APPROVED' || s.status === 'PAID').length;
    
    // Calculate total earnings (money received from approved submissions)
    const totalEarnings = userWithStats.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
    
    // Calculate total paid out (for challenges created)
    const totalPaid = userWithStats.challenges
      .filter((c: any) => c.status === 'ACTIVE' || c.status === 'COMPLETED')
      .reduce((sum: number, challenge: any) => sum + (challenge.rewardAmount || 0), 0);

    const profile = {
      id: userWithStats.id,
      username: userWithStats.username,
      email: userWithStats.email,
      avatarUrl: userWithStats.avatarUrl,
      isCreator: userWithStats.isCreator,
      joinedAt: userWithStats.createdAt.toISOString(),
      stats: {
        challengesCreated,
        totalSubmissions,
        approvedSubmissions,
        totalEarnings,
        totalPaid,
      },
    };

    return NextResponse.json({ profile });

  } catch (error) {
    console.error('Failed to get user profile:', error);
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
} 