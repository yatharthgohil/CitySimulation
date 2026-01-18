'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { PauseIcon, PlayIcon } from '@/components/ui/Icons';

export function SpeedControls() {
  const { state, setSpeed } = useGame();
  const { speed } = state;
  const [isTriggering, setIsTriggering] = useState(false);

  const triggerMatch = async () => {
    setIsTriggering(true);
    try {
      const response = await fetch('/api/dating/trigger-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        console.error('Failed to trigger match');
      }
    } catch (error) {
      console.error('Error triggering match:', error);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="flex items-center gap-0 bg-secondary rounded-md p-0">
      <Button
        onClick={() => setSpeed(0)}
        variant={speed === 0 ? 'default' : 'ghost'}
        size="icon-sm"
        className="h-7 w-7 p-0 m-0"
        title="Pause"
      >
        <PauseIcon size={12} />
      </Button>
      <Button
        onClick={triggerMatch}
        variant="ghost"
        size="icon-sm"
        className="h-7 w-7 p-0 m-0"
        title="Trigger Match"
        disabled={isTriggering}
      >
        <div className="flex items-center -space-x-[5px]">
          <PlayIcon size={12} />
          <PlayIcon size={12} />
        </div>
      </Button>
    </div>
  );
}
