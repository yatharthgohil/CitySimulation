'use client';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export const CircularProgress = ({ percentage, size = 48, strokeWidth = 3 }: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 70) return 'hsl(152, 82%, 45%)';
    if (percentage >= 30) return 'hsl(45, 100%, 50%)';
    return 'hsl(0, 72%, 60%)';
  };

  return (
    <div className="pm-circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(220, 15%, 20%)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-foreground font-semibold text-sm">{percentage}%</span>
        <span className="text-muted-foreground text-[10px]">chance</span>
      </div>
    </div>
  );
};

