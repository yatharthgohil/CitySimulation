import { NextRequest, NextResponse } from 'next/server';
import { analyzePhotoWithOvershoot, type IOSCharacterSummary } from '@/lib/dating/photoAnalysis';
import { getUserById, updateUserWithPhotoAnalysis } from '@/lib/userDatabase';

/**
 * API endpoint to receive photos from iOS app with character summary
 * Uses Overshoot SDK to perform deep visual analysis
 * 
 * Expected request format (multipart/form-data):
 * - photo: File (image/jpeg, image/png, etc.)
 * - userId: string (optional - if updating existing user)
 * - iosSummary: JSON string with { traits, personality, interests, characteristics }
 * 
 * Returns enhanced character profile combining iOS summary + Overshoot analysis
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File | null;
    const userId = formData.get('userId') as string | null;
    const iosSummaryJson = formData.get('iosSummary') as string | null;

    // Validate required fields
    if (!photo) {
      return NextResponse.json(
        { error: 'Missing required field: photo' },
        { status: 400 }
      );
    }

    if (!iosSummaryJson) {
      return NextResponse.json(
        { error: 'Missing required field: iosSummary' },
        { status: 400 }
      );
    }

    // Parse iOS summary
    let iosSummary: IOSCharacterSummary;
    try {
      iosSummary = JSON.parse(iosSummaryJson);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid iosSummary JSON format' },
        { status: 400 }
      );
    }

    // Validate iOS summary structure
    if (
      !iosSummary.traits ||
      !iosSummary.personality ||
      !iosSummary.interests ||
      !iosSummary.characteristics
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid iosSummary format. Expected: { traits: string[], personality: string, interests: string[], characteristics: string }',
        },
        { status: 400 }
      );
    }

    // Get Overshoot API configuration
    const apiKey = process.env.OVERSHOOT_API_KEY || '';
    const apiUrl = process.env.OVERSHOOT_API_URL || 'https://api.overshoot.ai';

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'OVERSHOOT_API_KEY not configured. Set OVERSHOOT_API_KEY in environment variables.',
        },
        { status: 500 }
      );
    }

    // Perform deep photo analysis using Overshoot SDK
    let deepProfile;
    try {
      deepProfile = await analyzePhotoWithOvershoot(
        photo,
        iosSummary,
        apiKey,
        apiUrl
      );
    } catch (analysisError: any) {
      console.error('Photo analysis error:', analysisError);
      return NextResponse.json(
        {
          error: 'Failed to analyze photo',
          details: analysisError.message,
        },
        { status: 500 }
      );
    }

    // If userId provided, update existing user
    if (userId) {
      try {
        const updatedUser = await updateUserWithPhotoAnalysis(userId, deepProfile);
        return NextResponse.json({
          success: true,
          user: updatedUser,
          deepProfile,
        });
      } catch (updateError: any) {
        return NextResponse.json(
          {
            error: 'Failed to update user',
            details: updateError.message,
          },
          { status: 500 }
        );
      }
    }

    // Return analysis results (user can be created separately or this can be extended)
    return NextResponse.json({
      success: true,
      deepProfile,
      message: userId
        ? 'User updated with photo analysis'
        : 'Photo analyzed. Use userId to update user profile.',
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

