import { NextRequest } from 'next/server';
import { datingService } from '@/lib/dating/datingService';
import { sseConnectionManager } from '@/lib/dating/sseConnectionManager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('userId required', { status: 400 });
  }

  const encoder = new TextEncoder();
  let keepAliveInterval: NodeJS.Timeout;
  
  const stream = new ReadableStream({
    start(controller) {
      const checkExistingMatch = () => {
        const match = datingService.getPendingMatchForUser(userId);
        if (match) {
          const data = `data: ${JSON.stringify(match)}\n\n`;
          controller.enqueue(encoder.encode(data));
          datingService.clearPendingMatchForUser(userId);
          clearInterval(keepAliveInterval);
          controller.close();
          return true;
        }
        return false;
      };

      if (checkExistingMatch()) {
        return;
      }

      sseConnectionManager.addConnection(userId, controller);

      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch (error) {
          clearInterval(keepAliveInterval);
          sseConnectionManager.removeConnection(userId);
          controller.close();
        }
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(keepAliveInterval);
        sseConnectionManager.removeConnection(userId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
