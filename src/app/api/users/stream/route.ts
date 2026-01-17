import { NextRequest } from 'next/server';
import { userEventEmitter } from '@/lib/userEventEmitter';
import { UserProfile } from '@/lib/userDatabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      console.log('SSE stream started, listener count:', userEventEmitter.listenerCount('userCreated'));
      const listener = (user: UserProfile) => {
        console.log('SSE listener triggered for user:', user.name);
        const data = `data: ${JSON.stringify(user)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      userEventEmitter.on('userCreated', listener);
      console.log('SSE listener registered, new count:', userEventEmitter.listenerCount('userCreated'));

      const keepAliveInterval = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 30000);

      request.signal.addEventListener('abort', () => {
        userEventEmitter.off('userCreated', listener);
        clearInterval(keepAliveInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

