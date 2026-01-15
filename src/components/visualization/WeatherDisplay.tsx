'use client';

import React, { useState, useEffect } from 'react';

// Simple weather icons as SVG
const WeatherIcons = {
  sunny: (
    <svg className="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  ),
  partlyCloudy: (
    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="9" r="3" fill="currentColor" opacity="0.3" />
      <path d="M9 6a3 3 0 0 0-3 3 2 2 0 0 0 2 2h7a2 2 0 0 0 2-2 3 3 0 0 0-3-3 3 3 0 0 0-3 3z" fill="currentColor" />
      <circle cx="12" cy="8" r="2" fill="yellow" opacity="0.6" />
    </svg>
  ),
  cloudy: (
    <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 10a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-4 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm8 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" fill="currentColor" opacity="0.4" />
      <path d="M7 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm10 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor" />
    </svg>
  ),
};

type WeatherType = 'sunny' | 'partlyCloudy' | 'cloudy';

function getRandomWeather(): { type: WeatherType; temp: number } {
  const types: WeatherType[] = ['sunny', 'partlyCloudy', 'cloudy'];
  const type = types[Math.floor(Math.random() * types.length)];
  // Spring/summer temperatures: 65-85°F
  const temp = Math.floor(Math.random() * 21) + 65;
  return { type, temp };
}

export function WeatherDisplay() {
  const [weather, setWeather] = useState(getRandomWeather());

  // Update weather every 30 seconds (optional, for demo purposes)
  useEffect(() => {
    const interval = setInterval(() => {
      setWeather(getRandomWeather());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {WeatherIcons[weather.type]}
      <span className="text-sm font-medium text-foreground">{weather.temp}°F</span>
    </div>
  );
}


