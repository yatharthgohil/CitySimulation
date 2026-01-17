import { NextRequest, NextResponse } from 'next/server';
import { datingService } from '@/lib/dating/datingService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const dateId = searchParams.get('dateId');

  switch (action) {
    case 'active':
      return NextResponse.json({ dates: datingService.getActiveDates() });
    
    case 'scheduled':
      return NextResponse.json({ dates: datingService.getScheduledDates() });
    
    case 'completed':
      return NextResponse.json({ dates: datingService.getCompletedDates() });
    
    case 'date':
      if (!dateId) return NextResponse.json({ error: 'dateId required' }, { status: 400 });
      const date = datingService.getDateById(dateId);
      return date 
        ? NextResponse.json({ date })
        : NextResponse.json({ error: 'Date not found' }, { status: 404 });
    
    case 'users':
      return NextResponse.json({ users: datingService.getUsers() });
    
    default:
      return NextResponse.json({ 
        active: datingService.getActiveDates(),
        scheduled: datingService.getScheduledDates(),
        completed: datingService.getCompletedDates()
      });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, dateId, maxDates } = body;

  try {
    switch (action) {
      case 'autoSchedule':
        const scheduled = await datingService.autoScheduleAndStart(maxDates || 3);
        return NextResponse.json({ scheduled, activeCount: datingService.getActiveCount() });
      
      case 'start':
        if (!dateId) return NextResponse.json({ error: 'dateId required' }, { status: 400 });
        await datingService.startDate(dateId);
        return NextResponse.json({ success: true, dateId });
      
      case 'end':
        if (!dateId) return NextResponse.json({ error: 'dateId required' }, { status: 400 });
        await datingService.endDate(dateId);
        return NextResponse.json({ success: true, dateId });
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
