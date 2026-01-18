'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ConfidenceGraph } from './ConfidenceGraph';

// Helper function to shuffle array randomly
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

interface UserProfile {
  id: string;
  name: string;
  gender: 'male' | 'female';
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  hasHat: boolean;
  hatColor: string | null;
  compatibilityInsight: string;
}

interface DateMessage {
  sender: string;
  senderName: string;
  message: string;
  timestamp: string;
}

interface UserDate {
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
  conversationHistory?: DateMessage[];
  messages?: DateMessage[];
  isMock?: boolean;
  confidence?: number;
}


// Simple pixelated avatar component
function PixelatedAvatar({ profile, size = 80 }: { profile: UserProfile; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    const scale = size / 20; // Scale factor for drawing
    const centerX = size / 2;
    const centerY = size / 2;

    // Draw head (circle)
    ctx.fillStyle = profile.skinColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 6 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Draw hair (simple top arc)
    if (!profile.hasHat) {
      ctx.fillStyle = '#2c1810'; // Dark hair color
      ctx.beginPath();
      ctx.arc(centerX, centerY - 6 * scale, 3.3 * scale, Math.PI, 0);
      ctx.fill();
    }

    // Draw hat if has one
    if (profile.hasHat && profile.hatColor) {
      ctx.fillStyle = profile.hatColor;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 7.5 * scale, 4 * scale, 1.5 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw body (ellipse)
    ctx.fillStyle = profile.shirtColor;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 1 * scale, 2.5 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw legs (two lines)
    ctx.strokeStyle = profile.pantsColor;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(centerX - 1 * scale, centerY + 5 * scale);
    ctx.lineTo(centerX - 1 * scale, centerY + 11 * scale);
    ctx.moveTo(centerX + 1 * scale, centerY + 5 * scale);
    ctx.lineTo(centerX + 1 * scale, centerY + 11 * scale);
    ctx.stroke();

    // Draw arms (two lines)
    ctx.strokeStyle = profile.skinColor;
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(centerX - 2.5 * scale, centerY);
    ctx.lineTo(centerX - 3.5 * scale, centerY + 4 * scale);
    ctx.moveTo(centerX + 2.5 * scale, centerY);
    ctx.lineTo(centerX + 3.5 * scale, centerY + 4 * scale);
    ctx.stroke();
  }, [profile, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

// Profile Card Component
function ProfileCard({ profile, onClick }: { profile: UserProfile; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
          <PixelatedAvatar profile={profile} size={80} />
        </div>
        <div className="text-center">
          <h3 className="font-medium text-sm text-foreground truncate w-full">{profile.name}</h3>
          <p className="text-xs text-muted-foreground capitalize">{profile.gender}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Profile Avatar Component for Dialog
function ProfileAvatar({ profile }: { profile: UserProfile }) {
  return (
    <div className="w-24 h-24 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center flex-shrink-0">
      <PixelatedAvatar profile={profile} size={96} />
    </div>
  );
}

export function ThirdTabPanel() {
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [userDates, setUserDates] = useState<UserDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<UserDate | null>(null);
  const [confidenceData, setConfidenceData] = useState<Array<{ dateId: string; confidence: number; timestamp: string }>>([]);
  const [compatibilityInsight, setCompatibilityInsight] = useState<string | null>(null);
  const [bestMatchName, setBestMatchName] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users/active');
        if (response.ok) {
          const users = await response.json();
          setProfiles(shuffleArray(users.map((user: any) => ({
            ...user,
            compatibilityInsight: user.compatibilityInsight || 'Analysis pending...',
          }))));
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();

    const eventSource = new EventSource('/api/users/stream');
    
    eventSource.onmessage = async (event) => {
      if (event.data === 'keepalive') return;
      try {
        const newUser = JSON.parse(event.data);
        setProfiles(prev => {
          if (prev.some(u => u.id === newUser.id)) return prev;
          return shuffleArray([...prev, {
            ...newUser,
            compatibilityInsight: newUser.compatibilityInsight || 'Analysis pending...',
          }]);
        });
      } catch (error) {
        console.error('Error processing SSE event:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (!selectedProfile) return;
    const fetchDates = async () => {
      try {
        const response = await fetch(`/api/dating?action=userDates&userId=${selectedProfile.id}`);
        const data = await response.json();
        setUserDates(data.dates || []);
      } catch (error) {
        setUserDates([]);
      }
    };
    
    const fetchConfidenceData = async () => {
      try {
        const response = await fetch(`/api/dating?action=confidenceData&userId=${selectedProfile.id}`);
        const data = await response.json();
        setConfidenceData(data.data || []);
      } catch (error) {
        setConfidenceData([]);
      }
    };
    
    fetchDates();
    fetchConfidenceData();
    const eventSource = new EventSource('/api/dating/stream');
    eventSource.onmessage = (event) => {
      if (event.data === 'keepalive') return;
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'datesUpdated' || payload.type === 'bestMatch') {
          fetchDates();
          fetchConfidenceData();
          // If best match event, also refresh best match
          if (payload.type === 'bestMatch' && payload.agentId === selectedProfile?.id) {
            fetch(`/api/dating?action=bestMatch&userId=${selectedProfile.id}`)
              .then(res => res.json())
              .then(data => {
                if (data.bestMatch) {
                  setBestMatchName(data.bestMatch.partnerName);
                }
              })
              .catch(console.error);
          }
        }
      } catch (error) {
        fetchDates();
        fetchConfidenceData();
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => eventSource.close();
  }, [selectedProfile]);

  const timelineDates = useMemo(() => {
    if (userDates.length === 0) return [];
    const sorted = [...userDates].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const active = sorted.filter(date => date.status === 'active');
    const rest = sorted.filter(date => date.status !== 'active');
    return [...rest, ...active];
  }, [userDates]);

  // Generate compatibility insight and find best match when dates change
  useEffect(() => {
    if (!selectedProfile || userDates.length === 0) {
      setCompatibilityInsight(null);
      setBestMatchName(null);
      return;
    }

    const generateInsight = async () => {
      try {
        // Get best match first
        const bestMatchResponse = await fetch(
          `/api/dating?action=bestMatch&userId=${selectedProfile.id}`
        );
        const bestMatchData = await bestMatchResponse.json();
        if (bestMatchData.bestMatch) {
          setBestMatchName(bestMatchData.bestMatch.partnerName);
        }

        // Get all unique partners
        const partners = new Set<string>();
        userDates.forEach(date => {
          if (date.user1Id === selectedProfile.id) partners.add(date.user2Id);
          if (date.user2Id === selectedProfile.id) partners.add(date.user1Id);
        });

        // Generate insight for the partner with most dates (primary relationship)
        if (partners.size === 0) return;

        const partnerDatesCount = new Map<string, number>();
        partners.forEach(partnerId => {
          const count = userDates.filter(d =>
            (d.user1Id === selectedProfile.id && d.user2Id === partnerId) ||
            (d.user2Id === selectedProfile.id && d.user1Id === partnerId)
          ).length;
          partnerDatesCount.set(partnerId, count);
        });

        const topPartner = Array.from(partnerDatesCount.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0];

        if (topPartner) {
          const response = await fetch(
            `/api/dating?action=compatibilityInsight&userId=${selectedProfile.id}&partnerId=${topPartner}`
          );
          const data = await response.json();
          if (data.insight) {
            setCompatibilityInsight(data.insight.insight);
          }
        }
      } catch (error) {
        console.error('Error generating compatibility insight:', error);
      }
    };

    generateInsight();
  }, [selectedProfile, userDates]);

  const getOtherName = (date: UserDate) => {
    if (!selectedProfile) return '';
    return date.user1Id === selectedProfile.id ? date.user2Name : date.user1Name;
  };

  const getDurationText = (date: UserDate) => {
    const start = new Date(date.startTime).getTime();
    const end = new Date(date.endTime).getTime();
    const durationMs = Math.max(0, end - start);
    const minutes = Math.max(1, Math.round(durationMs / 60000));
    return `${minutes} min`;
  };

  const getDateTimeText = (date: UserDate) => {
    const start = new Date(date.startTime);
    return `${start.toLocaleDateString()} ${start.toLocaleTimeString()}`;
  };

  const getChatMessages = (date: UserDate) => {
    return date.conversationHistory || date.messages || [];
  };

  const openChat = (date: UserDate) => {
    setSelectedDate(date);
  };

  const closeChat = () => setSelectedDate(null);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Fixed header */}
      <div className="flex-shrink-0 p-6 pb-4 border-b border-border bg-card z-10">
        <h2 className="text-2xl font-semibold text-foreground mb-1">User Database</h2>
        <p className="text-sm text-muted-foreground">Browse user profiles and view relationship information</p>
      </div>

      {/* Scrollable content - absolute positioning for guaranteed scroll */}
      <div className="absolute inset-0 top-[100px] overflow-y-auto overflow-x-hidden">
        <div className="p-6 pt-4">
          <div className="grid grid-cols-3 gap-4 pb-4">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onClick={() => setSelectedProfile(profile)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Profile Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedProfile && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <ProfileAvatar profile={selectedProfile} />
                  <div>
                    <DialogTitle className="text-2xl">{selectedProfile.name}</DialogTitle>
                    <DialogDescription className="capitalize mt-1">{selectedProfile.gender}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Events Timeline</h3>
                  <div className="relative h-20">
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border" />
                    <div className="absolute inset-0">
                      {timelineDates.map((date, index) => {
                        const left = timelineDates.length === 1 ? 50 : (index / (timelineDates.length - 1)) * 100;
                        const isActive = date.status === 'active';
                        return (
                          <button
                            key={date.id}
                            type="button"
                            onClick={() => openChat(date)}
                            className="absolute top-1/2 -translate-y-1/2 group"
                            style={{ left: `${left}%` }}
                          >
                            <span
                              className={`w-3 h-3 rounded-full block ${
                                isActive ? 'bg-green-500 animate-pulse' : 'bg-primary/60'
                              }`}
                            />
                            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-20 left-1/2 -translate-x-1/2 bg-card border border-border rounded-md shadow-md px-3 py-2 text-xs text-foreground whitespace-nowrap">
                              {isActive ? (
                                <div className="text-green-600">Currently on a date</div>
                              ) : (
                                <>
                                  <div>{getOtherName(date)}</div>
                                  <div>{getDateTimeText(date)}</div>
                                  <div>{getDurationText(date)}</div>
                                  <div>{date.sentiment || 'Neutral'}</div>
                                </>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {timelineDates.length === 0 && (
                    <div className="text-sm text-muted-foreground">No dates yet</div>
                  )}
                </div>

                <Separator />

                {/* Confidence Graph */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Confidence Trajectory</h3>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    {confidenceData.length > 0 ? (
                      <ConfidenceGraph 
                        data={confidenceData.map(d => ({
                          dateId: d.dateId,
                          confidence: d.confidence,
                          timestamp: d.timestamp
                        }))} 
                        width={600} 
                        height={200}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                        No confidence data available yet. Confidence scores will appear here after dates are completed with summaries.
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Compatibility Insight */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Compatibility Insight</h3>
                  {compatibilityInsight ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{compatibilityInsight}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{selectedProfile.compatibilityInsight || 'Analyzing compatibility...'}</p>
                  )}
                  
                  {/* Best Match Display */}
                  {bestMatchName && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm font-semibold text-primary">
                        Best partner compatibility: {bestMatchName}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && closeChat()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedDate && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProfile?.name} × {getOtherName(selectedDate)}</DialogTitle>
                <DialogDescription>
                  {selectedDate.status === 'active' ? 'Live date' : 'Past date'}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 border rounded-lg bg-muted/20">
                <ScrollArea className="h-80 p-3">
                  <div className="space-y-3">
                    {getChatMessages(selectedDate).map((msg, idx) => {
                      const isUser1 = msg.sender === selectedDate.user1Id;
                      return (
                        <div key={idx} className={`flex ${isUser1 ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                            isUser1 
                              ? 'bg-primary/10 border border-primary/20 rounded-tl-sm' 
                              : 'bg-secondary border border-secondary/50 rounded-tr-sm'
                          }`}>
                            <div className="text-[10px] font-medium text-muted-foreground mb-0.5">
                              {msg.senderName}
                            </div>
                            <div className="text-sm leading-relaxed">{msg.message}</div>
                          </div>
                        </div>
                      );
                    })}
                    {getChatMessages(selectedDate).length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-8">No chat history yet</div>
                    )}
                    
                    {/* Summary Section - right after chat messages */}
                    {selectedDate.summary && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <h4 className="text-sm font-semibold mb-2 text-foreground">Summary</h4>
                        <div className="text-sm text-blue-600/80 dark:text-blue-400/80 italic pl-2 border-l-2 border-blue-500/30">
                          {selectedDate.summary}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
