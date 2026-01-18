import { DateOrchestrator, DateSession } from './orchestrator';
import type { UserProfile } from '@/lib/userDatabase';
import { generateCompatibilityInsight } from './compatibilityInsight';
import { calculateConfidenceFromSummary } from './confidenceFromSummary';
import { sseConnectionManager } from './sseConnectionManager';
import fs from 'fs';
import path from 'path';

interface PendingMatch {
  partnerName: string;
  compatibilityPercentage: number;
  locationImageUrl?: string;
  restaurantName?: string;
  bookingId?: string;
  bookingTime?: string;
}

class DatingService {
  private orchestrator: DateOrchestrator;
  private users: UserProfile[] = [];
  private maleIndex: number = 0;
  private femaleIndex: number = 0;
  private dateDurationMs: number = 120000;
  private isScheduling: boolean = false;
  private isPaused: boolean = true;
  private pendingMatches: Map<string, PendingMatch> = new Map();

  constructor() {
    this.orchestrator = new DateOrchestrator();
    this.loadUsers();
  }

  private loadUsers() {
    try {
      const usersPath = path.join(process.cwd(), 'data', 'users.json');
      const data = fs.readFileSync(usersPath, 'utf-8');
      this.users = JSON.parse(data);
    } catch (e) {
      console.error('Failed to load users:', e);
      this.users = [];
    }
  }

  getUsers(): UserProfile[] {
    return this.users;
  }

  getUserById(userId: string): UserProfile | undefined {
    return this.users.find(u => u.id === userId);
  }

  private getMales(): UserProfile[] {
    return this.users.filter(u => u.gender === 'male');
  }

  private getFemales(): UserProfile[] {
    return this.users.filter(u => u.gender === 'female');
  }

  scheduleRoundRobinDate(): DateSession | null {
    const males = this.getMales();
    const females = this.getFemales();
    
    if (males.length === 0 || females.length === 0) return null;

    const activeUserIds = this.orchestrator.getActiveUserIds();
    
    let maleCandidate: UserProfile | null = null;
    let femaleCandidate: UserProfile | null = null;
    
    for (let i = 0; i < males.length; i++) {
      const idx = (this.maleIndex + i) % males.length;
      if (!activeUserIds.has(males[idx].id)) {
        maleCandidate = males[idx];
        this.maleIndex = (idx + 1) % males.length;
        break;
      }
    }
    
    for (let i = 0; i < females.length; i++) {
      const idx = (this.femaleIndex + i) % females.length;
      if (!activeUserIds.has(females[idx].id)) {
        femaleCandidate = females[idx];
        this.femaleIndex = (idx + 1) % females.length;
        break;
      }
    }

    if (!maleCandidate || !femaleCandidate) return null;

    const randomDurationMs = 60000 + Math.floor(Math.random() * 120001);
    const dateSession = this.orchestrator.scheduleDate(maleCandidate, femaleCandidate, randomDurationMs);
    return dateSession;
  }

  async autoScheduleAndStart(maxDates: number = 3): Promise<DateSession[]> {
    if (this.isScheduling || this.isPaused) return [];
    this.isScheduling = true;

    try {
      const activeCount = this.orchestrator.getActiveCount();
      if (activeCount >= maxDates) return [];

      const newDates: DateSession[] = [];
      const toSchedule = maxDates - activeCount;
      
      for (let i = 0; i < toSchedule; i++) {
        if (this.orchestrator.getActiveCount() >= maxDates) break;
        
        const date = this.scheduleRoundRobinDate();
        if (date) {
          newDates.push(date);
          
          await this.createMatchForUsers(date);
        }
      }
 
      const startPromises = newDates.map(date => this.orchestrator.startDate(date.id));
      await Promise.all(startPromises);

      return newDates;
    } finally {
      this.isScheduling = false;
    }
  }

  private async createMatchForUsers(date: DateSession): Promise<void> {
    const compatibilityPercentage = date.compatibilityRating 
      ? Math.round(date.compatibilityRating * 10) 
      : 85;

    const restaurantName = 'The Romantic Bistro';
    const bookingId = `booking-${date.id}`;
    const bookingTime = date.startTime.toISOString();
    const locationImageUrl = undefined;

    const matchData1: PendingMatch = {
      partnerName: date.user2Name,
      compatibilityPercentage,
      locationImageUrl,
      restaurantName,
      bookingId,
      bookingTime,
    };

    const matchData2: PendingMatch = {
      partnerName: date.user1Name,
      compatibilityPercentage,
      locationImageUrl,
      restaurantName,
      bookingId,
      bookingTime,
    };

    this.pendingMatches.set(date.user1Id, matchData1);
    this.pendingMatches.set(date.user2Id, matchData2);

    if (sseConnectionManager.hasConnection(date.user1Id)) {
      sseConnectionManager.sendMatch(date.user1Id, matchData1);
      this.pendingMatches.delete(date.user1Id);
    }

    if (sseConnectionManager.hasConnection(date.user2Id)) {
      sseConnectionManager.sendMatch(date.user2Id, matchData2);
      this.pendingMatches.delete(date.user2Id);
    }
  }

  getPendingMatchForUser(userId: string): PendingMatch | null {
    return this.pendingMatches.get(userId) || null;
  }

  clearPendingMatchForUser(userId: string): void {
    this.pendingMatches.delete(userId);
  }

  pauseScheduling() {
    this.isPaused = true;
  }

  resumeScheduling() {
    this.isPaused = false;
  }

  async startDate(dateId: string) {
    return this.orchestrator.startDate(dateId);
  }

  async endDate(dateId: string) {
    return this.orchestrator.endDate(dateId);
  }

  getActiveDates() {
    return this.orchestrator.getActiveDates();
  }

  getScheduledDates() {
    return this.orchestrator.getScheduledDates();
  }

  getCompletedDates() {
    return this.orchestrator.getCompletedDates();
  }

  getDatesForUser(userId: string) {
    const completed = this.orchestrator.getCompletedDates().filter(date => date.user1Id === userId || date.user2Id === userId);
    const active = this.orchestrator.getActiveDates().filter(date => date.user1Id === userId || date.user2Id === userId);
    return [...active, ...completed];
  }

  getDateById(dateId: string) {
    return this.orchestrator.getDateById(dateId);
  }

  getActiveCount(): number {
    return this.orchestrator.getActiveCount();
  }

  getDatesWithConfidence(userId: string) {
    // Backfill confidence for any dates missing it
    this.orchestrator.backfillConfidenceScores();
    
    const dates = this.getDatesForUser(userId);
    return dates
      .filter(d => {
        // If date has a summary but no confidence, calculate it now
        if (d.summary && d.confidence === undefined) {
          (d as any).confidence = calculateConfidenceFromSummary(d.summary);
        }
        return d.confidence !== undefined && d.status === 'completed';
      })
      .map(d => ({
        dateId: d.id,
        confidence: d.confidence!,
        timestamp: d.endTime
      }))
      .sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime();
        const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime();
        return timeA - timeB;
      });
  }

  async getCompatibilityInsight(userId: string, partnerId: string) {
    const allDates = this.orchestrator.getCompletedDates();
    return await generateCompatibilityInsight(userId, partnerId, allDates);
  }

  getBestMatchForUser(userId: string): { partnerId: string; partnerName: string; avgConfidence: number } | null {
    const allDates = this.orchestrator.getCompletedDates();
    
    // Get unique partners
    const partners = new Set<string>();
    allDates.forEach(date => {
      if (date.user1Id === userId) partners.add(date.user2Id);
      if (date.user2Id === userId) partners.add(date.user1Id);
    });

    if (partners.size === 0) return null;

    // Calculate average confidence per partner
    const partnerStats = Array.from(partners).map(partnerId => {
      const partnerDates = allDates.filter(d =>
        ((d.user1Id === userId && d.user2Id === partnerId) ||
         (d.user1Id === partnerId && d.user2Id === userId)) &&
        d.status === 'completed' &&
        d.confidence !== undefined
      );

      if (partnerDates.length === 0) return null;

      const avgConfidence = partnerDates.reduce((sum, d) => sum + (d.confidence || 0), 0) / partnerDates.length;
      const partnerName = partnerDates[0]?.user1Id === userId 
        ? partnerDates[0].user2Name 
        : partnerDates[0].user1Name;

      return {
        partnerId,
        partnerName,
        avgConfidence,
        dateCount: partnerDates.length
      };
    }).filter(Boolean) as Array<{ partnerId: string; partnerName: string; avgConfidence: number; dateCount: number }>;

    if (partnerStats.length === 0) return null;

    // Sort by: first by avg confidence, then by number of dates
    partnerStats.sort((a, b) => {
      if (Math.abs(a.avgConfidence - b.avgConfidence) < 0.05) {
        // If confidence is similar, prefer more dates
        return b.dateCount - a.dateCount;
      }
      return b.avgConfidence - a.avgConfidence;
    });

    const bestMatch = partnerStats[0];
    return {
      partnerId: bestMatch.partnerId,
      partnerName: bestMatch.partnerName,
      avgConfidence: bestMatch.avgConfidence
    };
  }
}

export const datingService = new DatingService();
