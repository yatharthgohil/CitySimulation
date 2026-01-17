import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/userDatabase';
import { userEventEmitter } from '@/lib/userEventEmitter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, age, gender, dateOfBirth, race, preferences } = body;

    if (!name || age === undefined || !gender || !dateOfBirth || !race) {
      return NextResponse.json(
        { error: 'Missing required fields: name, age, gender, dateOfBirth, race' },
        { status: 400 }
      );
    }

    if (!['male', 'female'].includes(gender)) {
      return NextResponse.json(
        { error: 'Invalid gender. Must be "male" or "female"' },
        { status: 400 }
      );
    }

    if (typeof age !== 'number' || age < 0 || age > 150) {
      return NextResponse.json(
        { error: 'Invalid age. Must be a number between 0 and 150' },
        { status: 400 }
      );
    }

    const user = await createUser({
      name,
      age,
      gender,
      dateOfBirth,
      race,
      preferences,
    });

    console.log('Emitting userCreated event for:', user.name);
    userEventEmitter.emitUserCreated(user);
    console.log('Event emitted, listeners:', userEventEmitter.listenerCount('userCreated'));

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

