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
  let isClosed = false;
  
  const stream = new ReadableStream({
    start(controller) {
      const safeClose = () => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch {
          // Ignore: controller may already be closed.
        }
      };

      const checkExistingMatch = () => {
        const match = datingService.getPendingMatchForUser(userId);
        if (match) {
          const data = `data: ${JSON.stringify(match)}\n\n`;
          try {
            controller.enqueue(encoder.encode(data));
          } catch {
            // If enqueue fails, close the connection safely.
          }
          datingService.clearPendingMatchForUser(userId);
          clearInterval(keepAliveInterval);
          safeClose();
          return true;
        }
        return false;
      };

      if (checkExistingMatch()) {
        return;
      }

      sseConnectionManager.addConnection(userId, controller);

      keepAliveInterval = setInterval(() => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch {
          clearInterval(keepAliveInterval);
          sseConnectionManager.removeConnection(userId);
          safeClose();
        }
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(keepAliveInterval);
        sseConnectionManager.removeConnection(userId);
        safeClose();
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
