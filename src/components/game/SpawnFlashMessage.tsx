'use client';

import React, { useState, useEffect } from 'react';

interface SpawnFlashMessageProps {
  name: string | null;
  onComplete: () => void;
}

export function SpawnFlashMessage({ name, onComplete }: SpawnFlashMessageProps) {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (name) {
      setVisible(true);
      setFadeOut(false);
      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
      }, 2500);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 3500);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [name, onComplete]);

  if (!visible || !name) return null;

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

