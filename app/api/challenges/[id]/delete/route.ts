import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const challengeId = params.id;

    // Verify the challenge exists and user is the creator
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { 
        id: true,
        creatorId: true, 
        status: true,
        title: true 
      }
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    if (challenge.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the challenge creator can delete challenges' },
        { status: 403 }
      );
    }

    // Only allow deletion of DRAFT challenges
    if (challenge.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft challenges can be deleted. Funded challenges cannot be removed.' },
        { status: 400 }
      );
    }

    // Delete the challenge (cascade will handle related records)
    await prisma.challenge.delete({
      where: { id: challengeId }
    });

    return NextResponse.json({
      success: true,
      message: `Challenge "${challenge.title}" deleted successfully`,
    });
  } catch (error) {
    console.error('Failed to delete challenge:', error);
    return NextResponse.json(
      { error: 'Failed to delete challenge' },
      { status: 500 }
    );
  }
} 