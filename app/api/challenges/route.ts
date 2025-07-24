import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { calculatePlatformFee, validateMinimumReward } from '@/lib/platform-fee';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '12');
  const rewardType = searchParams.get('reward_type');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sort') || 'newest';
  
  const offset = (page - 1) * limit;

  try {
    // Build where clause
    let whereClause: any = {
      status: 'ACTIVE',
      isFunded: true,
      visibility: 'PUBLIC', // Only show public challenges for now
    };

    // Add filters
    if (rewardType) {
      whereClause.rewardType = rewardType;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build order clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'deadline':
        orderBy = { deadline: 'asc' };
        break;
      case 'reward':
        orderBy = { rewardAmount: 'desc' };
        break;
      case 'popular':
        orderBy = { totalSubmissions: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [challenges, total] = await Promise.all([
      prisma.challenge.findMany({
        where: whereClause,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      }),
      prisma.challenge.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      challenges,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Failed to fetch challenges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is a creator
    if (!user.is_creator) {
      return NextResponse.json(
        { error: 'Only creators can create challenges' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { feeCalculation, ...challengeData } = body;

    // Validate required fields
    const requiredFields = ['title', 'description', 'reward_type', 'deadline', 'visibility'];
    for (const field of requiredFields) {
      if (!challengeData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate reward amount for USD/USDC
    if ((challengeData.reward_type === 'USD' || challengeData.reward_type === 'USDC')) {
      if (!challengeData.reward_amount) {
        return NextResponse.json(
          { error: 'Reward amount is required for USD/USDC challenges' },
          { status: 400 }
        );
      }

      // Validate minimum reward
      const validation = validateMinimumReward(challengeData.reward_amount);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.message },
          { status: 400 }
        );
      }

      // Recalculate fees to ensure consistency
      const recalculatedFees = calculatePlatformFee(
        challengeData.reward_amount,
        challengeData.buyout_fee_paid || false
      );

      // Verify fee calculation matches
      if (!feeCalculation || 
          Math.abs(feeCalculation.platformFee - recalculatedFees.platformFee) > 0.01 ||
          Math.abs(feeCalculation.netPayout - recalculatedFees.netPayout) > 0.01) {
        return NextResponse.json(
          { error: 'Fee calculation mismatch' },
          { status: 400 }
        );
      }
    }

    // Validate subscription ID for subscription rewards
    if (challengeData.reward_type === 'SUBSCRIPTION' && !challengeData.reward_subscription_id) {
      return NextResponse.json(
        { error: 'Subscription ID is required for subscription challenges' },
        { status: 400 }
      );
    }

    // Create challenge with platform fee data
    const challenge = await prisma.challenge.create({
      data: {
        creatorId: user.id,
        title: challengeData.title,
        description: challengeData.description,
        requiredTags: challengeData.required_tags || [],
        rewardType: challengeData.reward_type,
        rewardAmount: challengeData.reward_amount || 0,
        platformFee: feeCalculation?.platformFee || 0,
        netPayout: feeCalculation?.netPayout || challengeData.reward_amount || 0,
        buyoutFeePaid: challengeData.buyout_fee_paid || false,
        rewardSubscriptionId: challengeData.reward_subscription_id,
        deadline: new Date(challengeData.deadline),
        visibility: challengeData.visibility,
        whopCompanyId: challengeData.whop_company_id,
        status: 'DRAFT', // Created as draft until funded
        isFunded: false,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json(challenge, { status: 201 });
  } catch (error) {
    console.error('Failed to create challenge:', error);
    return NextResponse.json(
      { error: 'Failed to create challenge' },
      { status: 500 }
    );
  }
} 