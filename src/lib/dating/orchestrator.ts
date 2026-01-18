import { DatingAgent } from './datingAgent';
import { generateSystemPrompt } from './systemPrompts';
import type { UserProfile } from '@/lib/userDatabase';
import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { calculateConfidenceFromSummary } from './confidenceFromSummary';
import { bestMatchDetector } from './bestMatchDetector';

export interface DateSession {
  id: string;
  user1Id: string;
  user2Id: string;
  user1Name: string;
  user2Name: string;
  agent1: DatingAgent | null;
  agent2: DatingAgent | null;
  startTime: Date;
  endTime: Date;
  messages: Array<{ sender: string; senderName: string; message: string; timestamp: Date }>;
  status: 'scheduled' | 'active' | 'summarizing' | 'completed';
  summary?: string;
  sentiment?: string;
  compatibilityRating?: number;
  conversationHistory?: Array<{ sender: string; senderName: string; message: string; timestamp: Date }>;
  confidence?: number;
}

export const datingEventBus = new EventEmitter();

export class DateOrchestrator {
  private activeDates: Map<string, DateSession> = new Map();
  private dateQueue: DateSession[] = [];
  private completedDates: Map<string, DateSession> = new Map();
  private anthropicClient: Anthropic | null = null;
  private openRouterApiKey: string = '';
  private openRouterModel: string = 'anthropic/claude-3-haiku';
  private logDir = path.join(process.cwd(), 'logs', 'dating');

  // Expose getter for backfilling
  getAllCompletedDates(): DateSession[] {
    return Array.from(this.completedDates.values());
  }

  constructor() {
    this.initializeAnthropic();
    this.initializeOpenRouter();
    this.loadStateFromLogs();
    // Backfill confidence for existing dates after loading state
    this.backfillConfidenceScores();
  }

  private initializeAnthropic() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropicClient = new Anthropic({ apiKey });
    }
  }

  private initializeOpenRouter() {
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY || '';
    this.openRouterModel = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';
  }

  scheduleDate(user1: UserProfile, user2: UserProfile, durationMs: number = 120000): DateSession {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMs);

    const systemPrompt1 = generateSystemPrompt(user1);
    const systemPrompt2 = generateSystemPrompt(user2);

    const dateSession: DateSession = {
      id: `date-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user1Id: user1.id,
      user2Id: user2.id,
      user1Name: user1.name,
      user2Name: user2.name,
      agent1: new DatingAgent(user1, systemPrompt1, this.openRouterApiKey, this.openRouterModel),
      agent2: new DatingAgent(user2, systemPrompt2, this.openRouterApiKey, this.openRouterModel),
      startTime,
      endTime,
      messages: [],
      status: 'scheduled'
    };

    this.dateQueue.push(dateSession);
    this.logDateEvent('scheduled', dateSession);
    return dateSession;
  }

  async startDate(dateId: string): Promise<void> {
    const dateSession = this.dateQueue.find(d => d.id === dateId) || this.activeDates.get(dateId);
    if (!dateSession) throw new Error('Date not found');
    if (!dateSession.agent1 || !dateSession.agent2) throw new Error('Date agents not initialized');

    dateSession.status = 'active';
    this.activeDates.set(dateId, dateSession);
    this.dateQueue = this.dateQueue.filter(d => d.id !== dateId);

    const openingEntry = this.startStreamingMessage(dateSession, dateSession.user1Id, dateSession.user1Name);
    const openingMessage = await dateSession.agent1.initiateConversation(token => {
      openingEntry.message += token;
    });
    openingEntry.message = openingMessage;

    await this.logDateEvent('started', dateSession);
    await this.logMessageEvent(dateSession, openingEntry);
    datingEventBus.emit('datesUpdated', { dateId: dateSession.id, status: dateSession.status });

    this.runDateConversation(dateSession);
  }

  private async runDateConversation(dateSession: DateSession) {
    if (!dateSession.agent1 || !dateSession.agent2) return;
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
          await this.logMessageEvent(dateSession, entry);
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

    const summaryData = await this.generateClaudeSummary(dateSession);
    dateSession.summary = summaryData.summary;
    dateSession.sentiment = summaryData.sentiment;
    dateSession.compatibilityRating = summaryData.compatibilityRating;
    
    // Calculate confidence from summary
    if (dateSession.summary) {
      dateSession.confidence = calculateConfidenceFromSummary(dateSession.summary);
    }
    
    dateSession.status = 'completed';

    await this.logDateEvent('completed', dateSession);
    this.completedDates.set(dateId, dateSession);
    this.activeDates.delete(dateId);
    
    // Check for best matches for both users
    const allCompletedDates = Array.from(this.completedDates.values());
    bestMatchDetector.checkAndEmitBestMatches(dateSession.user1Id, allCompletedDates);
    bestMatchDetector.checkAndEmitBestMatches(dateSession.user2Id, allCompletedDates);
    
    datingEventBus.emit('datesUpdated', { dateId: dateSession.id, status: dateSession.status });
  }

  private async generateClaudeSummary(dateSession: DateSession): Promise<{ summary: string; sentiment: string; compatibilityRating: number }> {
    const conversationText = dateSession.messages
      .map(m => `${m.senderName}: ${m.message}`)
      .join('\n');

    if (this.anthropicClient) {
      try {
        const response = await this.anthropicClient.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: `You are a dating analyst. Return valid JSON only with keys: summary, sentiment, compatibilityRating.\n\nsummary: 2-3 sentences focusing on compatibility, chemistry, and key moments.\nsentiment: one word describing the overall mood/outcome.\ncompatibilityRating: number from 0-10.\n\nConversation:\n${conversationText}`
            }
          ]
        });
        const textBlock = response.content.find(block => block.type === 'text');
        if (textBlock && 'text' in textBlock) {
          try {
            const parsed = JSON.parse(textBlock.text);
            const rating = typeof parsed.compatibilityRating === 'number' ? parsed.compatibilityRating : 5;
            return {
              summary: typeof parsed.summary === 'string' ? parsed.summary : 'Date completed successfully.',
              sentiment: typeof parsed.sentiment === 'string' ? parsed.sentiment : 'Neutral',
              compatibilityRating: Math.max(0, Math.min(10, rating))
            };
          } catch (error) {
            console.error('Claude summary parse error:', error);
            return this.generateLocalSummary(dateSession);
          }
        }
        return this.generateLocalSummary(dateSession);
      } catch (error) {
        console.error('Claude summary error:', error);
        return this.generateLocalSummary(dateSession);
      }
    }

    return this.generateLocalSummary(dateSession);
  }

  private serializeDateSession(dateSession: DateSession) {
    const toMessage = (message: { sender: string; senderName: string; message: string; timestamp: Date }) => ({
      sender: message.sender,
      senderName: message.senderName,
      message: message.message,
      timestamp: message.timestamp.toISOString()
    });

    return {
      id: dateSession.id,
      user1Id: dateSession.user1Id,
      user2Id: dateSession.user2Id,
      user1Name: dateSession.user1Name,
      user2Name: dateSession.user2Name,
      startTime: dateSession.startTime.toISOString(),
      endTime: dateSession.endTime.toISOString(),
      status: dateSession.status,
      summary: dateSession.summary,
      sentiment: dateSession.sentiment,
      compatibilityRating: dateSession.compatibilityRating,
      messages: dateSession.messages.map(toMessage),
      conversationHistory: dateSession.conversationHistory ? dateSession.conversationHistory.map(toMessage) : undefined,
      confidence: dateSession.confidence
    };
  }

  private async logDateEvent(eventType: 'scheduled' | 'started' | 'completed', dateSession: DateSession) {
    const entry = {
      eventType,
      timestamp: new Date().toISOString(),
      date: this.serializeDateSession(dateSession)
    };

    await fs.mkdir(this.logDir, { recursive: true });
    await fs.appendFile(path.join(this.logDir, 'dates.jsonl'), `${JSON.stringify(entry)}\n`);
  }

  private async logMessageEvent(dateSession: DateSession, message: { sender: string; senderName: string; message: string; timestamp: Date }) {
    const entry = {
      eventType: 'message',
      timestamp: new Date().toISOString(),
      dateId: dateSession.id,
      message: {
        sender: message.sender,
        senderName: message.senderName,
        message: message.message,
        timestamp: message.timestamp.toISOString()
      }
    };

    await fs.mkdir(this.logDir, { recursive: true });
    await fs.appendFile(path.join(this.logDir, 'dates.jsonl'), `${JSON.stringify(entry)}\n`);
  }

  private async loadStateFromLogs() {
    try {
      const logPath = path.join(this.logDir, 'dates.jsonl');
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      const stateById = new Map<string, {
        date: ReturnType<DateOrchestrator['serializeDateSession']>;
        lastEventType: 'scheduled' | 'started' | 'completed';
        lastTimestamp: number;
        messages: Array<{ sender: string; senderName: string; message: string; timestamp: string }>;
      }>();

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.eventType === 'message') {
            const existing = stateById.get(entry.dateId);
            if (!existing) continue;
            existing.messages.push(entry.message);
            continue;
          }

          const date = entry.date;
          if (!date?.id) continue;
          const timestamp = new Date(entry.timestamp).getTime();
          const existing = stateById.get(date.id);
          if (!existing || timestamp >= existing.lastTimestamp) {
            stateById.set(date.id, {
              date,
              lastEventType: entry.eventType,
              lastTimestamp: timestamp,
              messages: date.messages || []
            });
          }
        } catch {
          continue;
        }
      }

      for (const entry of stateById.values()) {
        const seen = new Set<string>();
        const messages = entry.messages.filter(message => {
          const key = `${message.sender}|${message.senderName}|${message.timestamp}|${message.message}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const hydrated = this.hydrateDateSession({
          ...entry.date,
          messages
        });
        if (entry.lastEventType === 'completed') {
          this.completedDates.set(hydrated.id, hydrated);
        } else if (entry.lastEventType === 'started') {
          this.activeDates.set(hydrated.id, hydrated);
        } else {
          this.dateQueue.push(hydrated);
        }
      }
    } catch {
      return;
    }
  }

  private hydrateDateSession(date: {
    id: string;
    user1Id: string;
    user2Id: string;
    user1Name: string;
    user2Name: string;
    startTime: string;
    endTime: string;
    status: 'scheduled' | 'active' | 'summarizing' | 'completed';
    summary?: string;
    sentiment?: string;
    compatibilityRating?: number;
    messages?: Array<{ sender: string; senderName: string; message: string; timestamp: string }>;
    conversationHistory?: Array<{ sender: string; senderName: string; message: string; timestamp: string }>;
    confidence?: number;
  }): DateSession {
    const toMessage = (message: { sender: string; senderName: string; message: string; timestamp: string }) => ({
      sender: message.sender,
      senderName: message.senderName,
      message: message.message,
      timestamp: new Date(message.timestamp)
    });

    return {
      id: date.id,
      user1Id: date.user1Id,
      user2Id: date.user2Id,
      user1Name: date.user1Name,
      user2Name: date.user2Name,
      agent1: null,
      agent2: null,
      startTime: new Date(date.startTime),
      endTime: new Date(date.endTime),
      messages: (date.messages || []).map(toMessage),
      status: date.status,
      summary: date.summary,
      sentiment: date.sentiment,
      compatibilityRating: date.compatibilityRating,
      conversationHistory: date.conversationHistory ? date.conversationHistory.map(toMessage) : undefined,
      confidence: date.confidence
    };
  }

  private async generateLocalSummary(dateSession: DateSession): Promise<{ summary: string; sentiment: string; compatibilityRating: number }> {
    const conversationText = dateSession.messages
      .map(m => `${m.senderName}: ${m.message}`)
      .join('\n');

    const summaryPrompt = `Summarize this date conversation in 2-3 sentences, focusing on compatibility and key moments:\n\n${conversationText}`;

    if (!this.openRouterApiKey) {
      return {
        summary: 'Date completed successfully.',
        sentiment: 'Neutral',
        compatibilityRating: 5
      };
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000',
          'X-Title': process.env.OPENROUTER_APP_NAME || 'Isometric City Dating'
        },
        body: JSON.stringify({
          model: this.openRouterModel,
          messages: [
            {
              role: 'user',
              content: summaryPrompt
            }
          ],
          stream: false,
          temperature: 0.5,
          max_tokens: 100
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter request failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content || 'Date completed.';
      
      return {
        summary: summary.trim(),
        sentiment: 'Neutral',
        compatibilityRating: 5
      };
    } catch (error) {
      console.error('OpenRouter summary generation error:', error);
      return {
        summary: 'Date completed successfully.',
        sentiment: 'Neutral',
        compatibilityRating: 5
      };
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

  /**
   * Backfill confidence scores for dates that have summaries but no confidence
   */
  backfillConfidenceScores(): void {
    // Check completed dates
    for (const dateSession of this.completedDates.values()) {
      if (dateSession.summary && dateSession.confidence === undefined) {
        dateSession.confidence = calculateConfidenceFromSummary(dateSession.summary);
      }
    }

    // Also check dates in queue that might be completed
    for (const dateSession of this.dateQueue) {
      if (dateSession.status === 'completed' && dateSession.summary && dateSession.confidence === undefined) {
        dateSession.confidence = calculateConfidenceFromSummary(dateSession.summary);
      }
    }

    // Check active dates too
    for (const dateSession of this.activeDates.values()) {
      if (dateSession.status === 'completed' && dateSession.summary && dateSession.confidence === undefined) {
        dateSession.confidence = calculateConfidenceFromSummary(dateSession.summary);
      }
    }
  }
}
