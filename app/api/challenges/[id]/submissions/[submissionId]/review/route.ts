import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; submissionId: string }> }
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
    const submissionId = params.submissionId;
    const body = await request.json();
    const { action, rejectionReason } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action (approve/reject) is required' },
        { status: 400 }
      );
    }

    // Verify the challenge exists and user is the creator
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { creatorId: true, title: true }
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    if (challenge.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the challenge creator can review submissions' },
        { status: 403 }
      );
    }

    // Verify the submission exists and belongs to this challenge
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    if (submission.challengeId !== challengeId) {
      return NextResponse.json(
        { error: 'Submission does not belong to this challenge' },
        { status: 400 }
      );
    }

    if (submission.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Submission has already been reviewed' },
        { status: 400 }
      );
    }

    // Update submission status and challenge approved count in a transaction
    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    
    const [updatedSubmission] = await prisma.$transaction([
      // Update the submission
      prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: newStatus,
          rejectionReason: action === 'reject' ? rejectionReason : null,
          reviewedAt: new Date(),
        },
      }),
      // Update challenge approved submissions count if approved
      ...(action === 'approve' ? [
        prisma.challenge.update({
          where: { id: challengeId },
          data: {
            approvedSubmissions: {
              increment: 1,
            },
          },
        })
      ] : []),
    ]);

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: `Submission ${action}d successfully`,
    });
  } catch (error) {
    console.error('Failed to review submission:', error);
    return NextResponse.json(
      { error: 'Failed to review submission' },
      { status: 500 }
    );
  }
}