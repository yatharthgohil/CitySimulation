import { NextRequest, NextResponse } from 'next/server';
import { sseConnectionManager } from '@/lib/dating/sseConnectionManager';
import { datingService } from '@/lib/dating/datingService';

export async function POST(request: NextRequest) {
  try {
    const connectedUserIds = sseConnectionManager.getConnectedUserIds();
    
    if (connectedUserIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No connected users waiting for matches' 
      }, { status: 400 });
    }

    const users = datingService.getUsers();
    const matchesSent: string[] = [];

    for (const userId of connectedUserIds) {
      const currentUser = users.find(u => u.id === userId);
      if (!currentUser) continue;

      const oppositeGender = currentUser.gender === 'male' ? 'female' : 'male';
      const potentialPartners = users.filter(u => 
        u.gender === oppositeGender && u.id !== userId
      );

      if (potentialPartners.length === 0) continue;

      const partner = potentialPartners[Math.floor(Math.random() * potentialPartners.length)];
      
      const compatibilityPercentage = Math.floor(Math.random() * 20) + 75;

      const matchData = {
        partnerName: partner.name,
        compatibilityPercentage,
        locationImageUrl: undefined,
        restaurantName: undefined,
        bookingId: undefined,
        bookingTime: undefined,
      };

      const sent = sseConnectionManager.sendMatch(userId, matchData);
      if (sent) {
        matchesSent.push(userId);
      }
    }

    return NextResponse.json({ 
      success: true, 
      matchesSent: matchesSent.length,
      message: `Triggered matches for ${matchesSent.length} user(s)` 
    });
  } catch (error) {
    console.error('Error triggering match:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to trigger match' 
    }, { status: 500 });
  }
}

