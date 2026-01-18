import { datingEventBus } from '@/lib/dating/orchestrator';

export async function GET() {
  const encoder = new TextEncoder();
  let onUpdate: ((payload: unknown) => void) | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      onUpdate = () => send({ type: 'datesUpdated' });
      datingEventBus.on('datesUpdated', onUpdate);
      send({ type: 'connected' });
      keepalive = setInterval(() => {
        controller.enqueue(encoder.encode(`data: keepalive\n\n`));
      }, 20000);
    },
    cancel() {
      if (onUpdate) {
        datingEventBus.off('datesUpdated', onUpdate);
      }
      if (keepalive) {
        clearInterval(keepalive);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
}

