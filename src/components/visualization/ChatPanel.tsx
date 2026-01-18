'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface DateMessage {
  sender: string;
  senderName: string;
  message: string;
  timestamp: string;
}

interface DateSession {
  id: string;
  user1Id: string;
  user2Id: string;
  user1Name: string;
  user2Name: string;
  startTime: string;
  endTime: string;
  messages: DateMessage[];
  status: 'scheduled' | 'active' | 'summarizing' | 'completed';
  summary?: string;
}

function DateCard({ date }: { date: DateSession }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);

  useEffect(() => {
    if (date.messages.length > prevMessageCount.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevMessageCount.current = date.messages.length;
  }, [date.messages.length]);

  const [timeRemaining, setTimeRemaining] = useState('0:00');

  useEffect(() => {
    const endTime = new Date(date.endTime).getTime();
    const updateRemaining = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    updateRemaining();
    if (date.status !== 'active') return;
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [date.status, date.endTime]);

  return (
    <div className="flex flex-col h-full border rounded-xl bg-gradient-to-b from-card to-muted/20 shadow-lg overflow-hidden">
      <div className="px-4 py-3 border-b bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold text-sm">
              {date.user1Name} × {date.user2Name}
            </span>
          </div>
          {date.status === 'active' && (
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
              {timeRemaining}
            </span>
          )}
          {date.status === 'summarizing' && (
            <span className="text-xs text-amber-500 animate-pulse">Summarizing...</span>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {date.messages.map((msg, idx) => {
          const isUser1 = msg.sender === date.user1Id;
          return (
            <div key={idx} className={`flex ${isUser1 ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${
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
        {date.messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Starting conversation...
          </div>
        )}
      </div>

      {date.status === 'summarizing' && (
        <div className="px-4 py-3 border-t bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-600">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Generating summary...</span>
          </div>
        </div>
      )}

      {date.status === 'completed' && date.summary && (
        <div className="px-4 py-3 border-t bg-green-500/10">
          <div className="text-xs font-medium text-green-600 mb-1">Summary</div>
          <p className="text-xs text-muted-foreground leading-relaxed">{date.summary}</p>
        </div>
      )}
    </div>
  );
}

export function ChatPanel() {
  const [activeDates, setActiveDates] = useState<DateSession[]>([]);
  const initRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/dating?action=active');
      const data = await response.json();
      const visibleDates = (data.dates || []).filter((date: DateSession) => date.status === 'active' || date.status === 'summarizing');
      setActiveDates(visibleDates);
      return visibleDates.filter((d: DateSession) => d.status === 'active').length;
    } catch (error) {
      console.error('Failed to fetch dating data:', error);
      return 0;
    }
  }, []);

  const initializeAutoSchedule = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;
    try {
      await fetch('/api/dating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'autoSchedule', maxDates: 3 })
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to auto-schedule:', error);
    }
  }, [fetchData]);

  useEffect(() => {
    fetch('/api/dating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' })
    });
    fetchData();
    return () => {
      fetch('/api/dating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' })
      });
    };
  }, [fetchData]);

  useEffect(() => {
    const id = setTimeout(() => initializeAutoSchedule(), 0);
    return () => clearTimeout(id);
  }, [initializeAutoSchedule]);

  useEffect(() => {
    const eventSource = new EventSource('/api/dating/stream');
    eventSource.onmessage = async (event) => {
      if (event.data === 'keepalive') return;
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'connected') {
          await fetchData();
        }
        if (payload.type === 'datesUpdated') {
          const activeCount = await fetchData();
          if (activeCount < 3) {
            await fetch('/api/dating', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'autoSchedule', maxDates: 3 })
            });
            await fetchData();
          }
        }
      } catch {
        await fetchData();
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => eventSource.close();
  }, [fetchData]);

  return (
    <div className="w-full p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-1">💫 Live Activity</h2>
        <p className="text-sm text-muted-foreground">
          Watch AI avatars go on virtual dates in real-time
        </p>
      </div>

      <div className="flex flex-col gap-4 pb-4">
        {activeDates.slice(0, 3).map((date) => (
          <div key={date.id} className="h-[300px]">
            <DateCard date={date} />
          </div>
        ))}
        {activeDates.length === 0 && (
          <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/5">
            <div className="text-center">
              <div className="text-4xl mb-2 opacity-30">💝</div>
              <div className="text-sm text-muted-foreground">No active dates</div>
              <div className="text-xs text-muted-foreground/60 mt-1">Waiting for matches...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

