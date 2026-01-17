'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

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
  relationshipArc: string;
  dateSummary: string;
  compatibilityInsight: string;
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
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users/active');
        if (response.ok) {
          const users = await response.json();
          setProfiles(shuffleArray(users.map((user: any) => ({
            ...user,
            relationshipArc: user.relationshipArc || 'Coming soon...',
            dateSummary: user.dateSummary || 'No dates recorded yet.',
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
            relationshipArc: newUser.relationshipArc || 'Coming soon...',
            dateSummary: newUser.dateSummary || 'No dates recorded yet.',
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
                  <h3 className="font-semibold text-lg mb-2">Relationship Arc</h3>
                  <p className="text-sm text-muted-foreground">{selectedProfile.relationshipArc}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-lg mb-2">Date Summary</h3>
                  <p className="text-sm text-muted-foreground">{selectedProfile.dateSummary}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-lg mb-2">Compatibility Insight</h3>
                  <p className="text-sm text-muted-foreground">{selectedProfile.compatibilityInsight}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
