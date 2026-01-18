import { DateOrchestrator, DateSession } from './orchestrator';
import type { UserProfile } from '@/lib/userDatabase';
import fs from 'fs';
import path from 'path';

class DatingService {
  private orchestrator: DateOrchestrator;
  private users: UserProfile[] = [];
  private maleIndex: number = 0;
  private femaleIndex: number = 0;
  private dateDurationMs: number = 120000;
  private isScheduling: boolean = false;
  private isPaused: boolean = true;

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

    const dateSession = this.orchestrator.scheduleDate(maleCandidate, femaleCandidate, this.dateDurationMs);
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
        }
      }
 
      const startPromises = newDates.map(date => this.orchestrator.startDate(date.id));
      await Promise.all(startPromises);

      return newDates;
    } finally {
      this.isScheduling = false;
    }
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
}

export const datingService = new DatingService();
