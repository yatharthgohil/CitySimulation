import { EventEmitter } from 'events';

interface SSEController {
  enqueue: (data: Uint8Array) => void;
  close: () => void;
}

class SSEConnectionManager extends EventEmitter {
  private connections: Map<string, SSEController> = new Map();

  addConnection(userId: string, controller: SSEController): void {
    this.connections.set(userId, controller);
    console.log(`SSE connection added for user: ${userId}`);
  }

  removeConnection(userId: string): void {
    this.connections.delete(userId);
    console.log(`SSE connection removed for user: ${userId}`);
  }

  sendMatch(userId: string, matchData: unknown): boolean {
    const controller = this.connections.get(userId);
    if (!controller) {
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const data = `data: ${JSON.stringify(matchData)}\n\n`;
      controller.enqueue(encoder.encode(data));
      this.removeConnection(userId);
      controller.close();
      return true;
    } catch (error) {
      console.error(`Error sending match to user ${userId}:`, error);
      this.removeConnection(userId);
      controller.close();
      return false;
    }
  }

  hasConnection(userId: string): boolean {
    return this.connections.has(userId);
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

export const sseConnectionManager = new SSEConnectionManager();

