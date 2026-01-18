'use client';

import { RefreshCw, Gift, Bookmark } from 'lucide-react';
import { CircularProgress } from './CircularProgress';

interface PredictionCardProps {
  title: string;
  percentage: number;
  volume: string;
  showCircularProgress?: boolean;
}

export const PredictionCard = ({
  title,
  percentage,
  volume,
  showCircularProgress = true,
}: PredictionCardProps) => {
  return (
    <div className="pm-card group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <h3 className="text-foreground font-medium text-sm leading-tight flex-1 transition-colors duration-200 group-hover:text-[hsl(210,100%,52%)]">
            {title}
          </h3>
        </div>
        {showCircularProgress && <CircularProgress percentage={percentage} />}
      </div>

      <div className="flex gap-2 mb-4">
        <button className="pm-btn-yes pm-btn-micro flex-1">Yes</button>
        <button className="pm-btn-no pm-btn-micro flex-1">No</button>
      </div>

      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <div className="flex items-center gap-2">
          <span>{volume} Vol.</span>
          <RefreshCw className="w-3 h-3 pm-icon-hover" />
        </div>
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 pm-icon-hover" />
          <Bookmark className="w-4 h-4 pm-icon-hover" />
        </div>
      </div>
    </div>
  );
};

