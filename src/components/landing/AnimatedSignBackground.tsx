'use client';

import React from 'react';

interface AnimatedSignBackgroundProps {
  className?: string;
}

/**
 * Animated background component that smoothly transitions between
 * two sign images (glowing and non-glowing) for a blinking effect
 */
export function AnimatedSignBackground({ className = '' }: AnimatedSignBackgroundProps) {
  return (
    <div className={`fixed inset-0 overflow-hidden z-0 ${className}`}>
      {/* Base layer - non-glowing sign (always visible) */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat sign-blink-off"
        style={{
          backgroundImage: 'url(/assets/landing/sign-off.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Overlay layer - glowing sign (only glow fades in/out) */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat sign-blink-on"
        style={{
          backgroundImage: 'url(/assets/landing/sign-on.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
    </div>
  );
}

