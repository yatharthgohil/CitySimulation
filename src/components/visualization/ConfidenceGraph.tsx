'use client';

import React, { useMemo } from 'react';

interface ConfidenceDataPoint {
  dateId: string;
  confidence: number;
  timestamp: Date | string;
}

interface ConfidenceGraphProps {
  data: ConfidenceDataPoint[];
  width?: number;
  height?: number;
  className?: string;
}

export function ConfidenceGraph({ 
  data, 
  width = 600, 
  height = 200,
  className = ''
}: ConfidenceGraphProps) {
  const { points, minY, maxY, minX, maxX } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], minY: 0, maxY: 1, minX: 0, maxX: 1 };
    }

    // Sort by timestamp
    const sorted = [...data].sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime();
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime();
      return timeA - timeB;
    });
    
    // Get min/max for normalization
    const confidences = sorted.map(d => d.confidence);
    const timestamps = sorted.map(d => {
      const ts = typeof d.timestamp === 'string' ? new Date(d.timestamp) : d.timestamp;
      return ts.getTime();
    });
    
    const minY = Math.max(0, Math.min(...confidences) - 0.1);
    const maxY = Math.min(1, Math.max(...confidences) + 0.1);
    const minX = Math.min(...timestamps);
    const maxX = Math.max(...timestamps);

    // Padding for graph
    const paddingX = 40;
    const paddingY = 20;
    const graphWidth = width - paddingX * 2;
    const graphHeight = height - paddingY * 2;

    // Convert to SVG coordinates
    const points = sorted.map((point, index) => {
      const ts = typeof point.timestamp === 'string' ? new Date(point.timestamp) : point.timestamp;
      const x = paddingX + ((ts.getTime() - minX) / (maxX - minX || 1)) * graphWidth;
      const y = paddingY + graphHeight - ((point.confidence - minY) / (maxY - minY || 1)) * graphHeight;
      return { x, y, confidence: point.confidence, index };
    });

    return { points, minY, maxY, minX, maxX };
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-sm text-muted-foreground ${className}`} style={{ width, height }}>
        No confidence data available
      </div>
    );
  }

  if (data.length === 1) {
    // Single point - draw a dot
    const point = points[0];
    return (
      <svg width={width} height={height} className={className}>
        <circle cx={point.x} cy={point.y} r="4" fill="hsl(var(--primary))" />
        <text 
          x={point.x} 
          y={point.y - 8} 
          textAnchor="middle" 
          className="text-xs fill-muted-foreground"
          fontSize="10"
        >
          {(point.confidence * 100).toFixed(0)}%
        </text>
      </svg>
    );
  }

  // Generate path for line
  const pathData = points.map((point, index) => {
    return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }).join(' ');

  // Generate area path (for fill under line)
  const areaPathData = [
    `M ${points[0].x} ${height - 20}`, // Start at bottom
    ...points.map(p => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${height - 20}`, // End at bottom
    'Z'
  ].join(' ');

  return (
    <svg width={width} height={height} className={className}>
      {/* Grid lines */}
      <defs>
        <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Y-axis grid lines and labels */}
      {[0, 0.25, 0.5, 0.75, 1].map(value => {
        const y = 20 + (height - 40) - ((value - minY) / (maxY - minY || 1)) * (height - 40);
        return (
          <g key={value}>
            <line
              x1={40}
              y1={y}
              x2={width - 40}
              y2={y}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.5"
            />
            <text
              x={38}
              y={y + 4}
              textAnchor="end"
              className="text-xs fill-muted-foreground"
              fontSize="9"
            >
              {(value * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path
        d={areaPathData}
        fill="url(#confidenceGradient)"
      />

      {/* Main line */}
      <path
        d={pathData}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((point, index) => (
        <g key={index}>
          <circle
            cx={point.x}
            cy={point.y}
            r="3"
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth="2"
          />
        </g>
      ))}

      {/* X-axis */}
      <line
        x1={40}
        y1={height - 20}
        x2={width - 40}
        y2={height - 20}
        stroke="hsl(var(--border))"
        strokeWidth="1"
      />

      {/* Y-axis */}
      <line
        x1={40}
        y1={20}
        x2={40}
        y2={height - 20}
        stroke="hsl(var(--border))"
        strokeWidth="1"
      />
    </svg>
  );
}

