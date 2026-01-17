import { DatingAgent } from './datingAgent';
import { generateSystemPrompt } from './systemPrompts';
import type { UserProfile } from '@/lib/userDatabase';
import Anthropic from '@anthropic-ai/sdk';

export interface DateSession {
  id: string;
  user1Id: string;
  user2Id: string;
  user1Name: string;
  user2Name: string;
  agent1: DatingAgent;
  agent2: DatingAgent;
  startTime: Date;
  endTime: Date;
  messages: Array<{ sender: string; senderName: string; message: string; timestamp: Date }>;
  status: 'scheduled' | 'active' | 'summarizing' | 'completed';
  summary?: string;
  conversationHistory?: Array<{ sender: string; senderName: string; message: string; timestamp: Date }>;
}

interface Mem0Client {
  add: (messages: Array<{ role: string; content: string }>, options: { user_id: string }) => Promise<void>;
  search: (query: string, options: Record<string, unknown>) => Promise<unknown>;
}

export class DateOrchestrator {
  private activeDates: Map<string, DateSession> = new Map();
  private dateQueue: DateSession[] = [];
  private completedDates: Map<string, DateSession> = new Map();
  private mem0Client: Mem0Client | null = null;
  private anthropicClient: Anthropic | null = null;
  private ollamaUrls: string[] = [];
  private ollamaIndex = 0;

  constructor(mem0Config?: { apiKey: string }) {
    if (mem0Config) {
      this.initializeMem0(mem0Config);
    }
    this.initializeAnthropic();
    this.initializeOllamaUrls();
  }

  private async initializeMem0(config: { apiKey: string }) {
    try {
      const MemoryClient = (await import('mem0ai')).default;
      this.mem0Client = new MemoryClient({ apiKey: config.apiKey }) as unknown as Mem0Client;
    } catch (e) {
      console.warn('Mem0 not initialized (optional):', e);
    }
  }

  private initializeAnthropic() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropicClient = new Anthropic({ apiKey });
    }
  }

  private initializeOllamaUrls() {
    const urls = process.env.OLLAMA_BASE_URLS || process.env.OLLAMA_BASE_URL || '';
    const bases = urls
      .split(',')
      .map(url => url.trim())
      .filter(Boolean);

    if (bases.length === 0) {
      this.ollamaUrls = ['http://localhost:11434/api/chat'];
      return;
    }

    this.ollamaUrls = bases.map(base => base.endsWith('/api/chat') ? base : `${base.replace(/\/$/, '')}/api/chat`);
  }

  scheduleDate(user1: UserProfile, user2: UserProfile, durationMs: number = 120000): DateSession {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMs);

    const systemPrompt1 = generateSystemPrompt(user1);
    const systemPrompt2 = generateSystemPrompt(user2);
    const [url1, url2] = this.getNextOllamaUrls();

    const dateSession: DateSession = {
      id: `date-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user1Id: user1.id,
      user2Id: user2.id,
      user1Name: user1.name,
      user2Name: user2.name,
      agent1: new DatingAgent(user1, systemPrompt1, url1),
      agent2: new DatingAgent(user2, systemPrompt2, url2),
      startTime,
      endTime,
      messages: [],
      status: 'scheduled'
    };

    this.dateQueue.push(dateSession);
    return dateSession;
  }

  private getNextOllamaUrls(): [string, string] {
    if (this.ollamaUrls.length === 1) {
      return [this.ollamaUrls[0], this.ollamaUrls[0]];
    }

    const url1 = this.ollamaUrls[this.ollamaIndex % this.ollamaUrls.length];
    const url2 = this.ollamaUrls[(this.ollamaIndex + 1) % this.ollamaUrls.length];
    this.ollamaIndex = (this.ollamaIndex + 2) % this.ollamaUrls.length;
    return [url1, url2];
  }

  async startDate(dateId: string): Promise<void> {
    const dateSession = this.dateQueue.find(d => d.id === dateId) || this.activeDates.get(dateId);
    if (!dateSession) throw new Error('Date not found');

    dateSession.status = 'active';
    this.activeDates.set(dateId, dateSession);
    this.dateQueue = this.dateQueue.filter(d => d.id !== dateId);

    const openingEntry = this.startStreamingMessage(dateSession, dateSession.user1Id, dateSession.user1Name);
    const openingMessage = await dateSession.agent1.initiateConversation(token => {
      openingEntry.message += token;
    });
    openingEntry.message = openingMessage;

    this.runDateConversation(dateSession);
  }

  private async runDateConversation(dateSession: DateSession) {
    let currentAgent = dateSession.agent2;
    let currentUserId = dateSession.user2Id;
    let currentUserName = dateSession.user2Name;
    let respondingAgent = dateSession.agent1;
    let respondingUserId = dateSession.user1Id;
    let respondingUserName = dateSession.user1Name;
    let lastMessage = dateSession.messages[0]?.message || '';

    const conversationLoop = async () => {
      while (Date.now() < dateSession.endTime.getTime() && dateSession.status === 'active') {
        try {
          const entry = this.startStreamingMessage(dateSession, currentUserId, currentUserName);
          const response = await currentAgent.respondToMessage(lastMessage, token => {
            entry.message += token;
          });
          entry.message = response;
          lastMessage = response;

          [currentAgent, respondingAgent] = [respondingAgent, currentAgent];
          [currentUserId, respondingUserId] = [respondingUserId, currentUserId];
          [currentUserName, respondingUserName] = [respondingUserName, currentUserName];
        } catch (error) {
          console.error('Conversation error:', error);
          break;
        }
      }
      
      if (Date.now() >= dateSession.endTime.getTime()) {
        await this.endDate(dateSession.id);
      }
    };

    conversationLoop();
  }

  private logMessage(dateSession: DateSession, senderId: string, senderName: string, message: string) {
    dateSession.messages.push({
      sender: senderId,
      senderName,
      message,
      timestamp: new Date()
    });
  }

  private startStreamingMessage(dateSession: DateSession, senderId: string, senderName: string) {
    const entry = {
      sender: senderId,
      senderName,
      message: '',
      timestamp: new Date()
    };
    dateSession.messages.push(entry);
    return entry;
  }

  async endDate(dateId: string): Promise<void> {
    const dateSession = this.activeDates.get(dateId);
    if (!dateSession) return;

    dateSession.status = 'summarizing';
    dateSession.conversationHistory = [...dateSession.messages];

    const summary = await this.generateClaudeSummary(dateSession);
    dateSession.summary = summary;
    dateSession.status = 'completed';

    if (this.mem0Client) {
      await this.updateMemories(dateSession, summary);
    }

    this.completedDates.set(dateId, dateSession);
    this.activeDates.delete(dateId);
  }

  private async generateClaudeSummary(dateSession: DateSession): Promise<string> {
    const conversationText = dateSession.messages
      .map(m => `${m.senderName}: ${m.message}`)
      .join('\n');

    if (this.anthropicClient) {
      try {
        const response = await this.anthropicClient.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 150,
          messages: [
            {
              role: 'user',
              content: `You are a dating analyst. Summarize this date conversation in 2-3 sentences, focusing on compatibility, chemistry, and key moments. Be concise but insightful.\n\n${conversationText}`
            }
          ]
        });
        const textBlock = response.content.find(block => block.type === 'text');
        return textBlock && 'text' in textBlock ? textBlock.text : 'Date completed successfully.';
      } catch (error) {
        console.error('Claude summary error:', error);
        return this.generateLocalSummary(dateSession);
      }
    }

    return this.generateLocalSummary(dateSession);
  }

  private async generateLocalSummary(dateSession: DateSession): Promise<string> {
    const conversationText = dateSession.messages
      .map(m => `${m.senderName}: ${m.message}`)
      .join('\n');

    const summaryPrompt = `Summarize this date conversation in 2-3 sentences, focusing on compatibility and key moments:\n\n${conversationText}`;

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'adi0adi/ollama_stheno-8b_v3.1_q6k',
          prompt: summaryPrompt,
          stream: false,
          options: { temperature: 0.5, num_predict: 100 }
        })
      });

      const data = await response.json();
      return data.response || 'Date completed.';
    } catch {
      return 'Date completed successfully.';
    }
  }

  private async updateMemories(dateSession: DateSession, summary: string) {
    if (!this.mem0Client) return;

    try {
      const user1Memory = [
        { role: 'user', content: `I went on a date.` },
        { role: 'assistant', content: `You had a date with ${dateSession.user2Name}. ${summary}` }
      ];
      const user2Memory = [
        { role: 'user', content: `I went on a date.` },
        { role: 'assistant', content: `You had a date with ${dateSession.user1Name}. ${summary}` }
      ];

      await this.mem0Client.add(user1Memory, { user_id: dateSession.user1Id });
      await this.mem0Client.add(user2Memory, { user_id: dateSession.user2Id });
    } catch (e) {
      console.error('Failed to update memories:', e);
    }
  }

  getActiveUserIds(): Set<string> {
    const activeIds = new Set<string>();
    this.activeDates.forEach(date => {
      activeIds.add(date.user1Id);
      activeIds.add(date.user2Id);
    });
    this.dateQueue.forEach(date => {
      activeIds.add(date.user1Id);
      activeIds.add(date.user2Id);
    });
    return activeIds;
  }

  getActiveDates(): DateSession[] {
    return Array.from(this.activeDates.values());
  }

  getScheduledDates(): DateSession[] {
    return [...this.dateQueue];
  }

  getCompletedDates(): DateSession[] {
    return Array.from(this.completedDates.values());
  }

  getDateById(dateId: string): DateSession | undefined {
    return this.activeDates.get(dateId) || this.dateQueue.find(d => d.id === dateId) || this.completedDates.get(dateId);
  }

  getActiveCount(): number {
    return this.activeDates.size;
  }
}
