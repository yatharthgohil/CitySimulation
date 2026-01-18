'use client';

import React, { useState, useEffect } from 'react';

interface SpawnFlashMessageProps {
  name: string | null;
  onComplete: () => void;
}

function FlashContent({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1500);
    const hideTimer = setTimeout(() => {
      onComplete();
    }, 2500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-1000 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="bg-black/80 px-8 py-6 rounded-2xl border-2 border-white/30 shadow-2xl">
        <p className="text-white text-2xl md:text-4xl font-bold text-center">
          <span className="text-red-400">{name}</span> has been added to Turing City!
        </p>
      </div>
    </div>
  );
}

export function SpawnFlashMessage({ name, onComplete }: SpawnFlashMessageProps) {
  if (!name) return null;
  return <FlashContent key={name} name={name} onComplete={onComplete} />;
}

