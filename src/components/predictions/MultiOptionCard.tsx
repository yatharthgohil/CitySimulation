'use client';

import { RefreshCw, Bookmark } from 'lucide-react';

interface Option {
  name: string;
  percentage: number;
}

interface MultiOptionCardProps {
  title: string;
  options: Option[];
  volume: string;
}

export const MultiOptionCard = ({
  title,
  options,
  volume,
}: MultiOptionCardProps) => {
  return (
    <div className="pm-card group">
      <div className="flex items-start gap-3 mb-4">
        <h3 className="text-foreground font-medium text-sm leading-tight transition-colors duration-200 group-hover:text-[hsl(210,100%,52%)]">
          {title}
        </h3>
      </div>

      <div className="space-y-2 mb-4">
        {options.map((option, index) => (
          <div 
            key={option.name} 
            className="flex items-center justify-between transition-all duration-200 hover:bg-[hsl(220,20%,16%)] rounded px-1 -mx-1"
            style={{ transitionDelay: `${index * 30}ms` }}
          >
            <span className="text-foreground text-sm truncate flex-1 mr-2">
              {option.name}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-foreground font-medium text-sm transition-all duration-200">
                {option.percentage}%
              </span>
              <button className="text-[hsl(152,82%,45%)] text-xs font-medium px-2 py-1 border border-[hsl(152,82%,45%)] rounded hover:bg-[hsl(152,82%,45%)] hover:text-white transition-all duration-150 active:scale-95">
                Yes
              </button>
              <button className="text-[hsl(0,72%,60%)] text-xs font-medium px-2 py-1 border border-[hsl(0,72%,60%)] rounded hover:bg-[hsl(0,72%,60%)] hover:text-white transition-all duration-150 active:scale-95">
                No
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <div className="flex items-center gap-2">
          <span>{volume} Vol.</span>
          <RefreshCw className="w-3 h-3 pm-icon-hover" />
        </div>
        <Bookmark className="w-4 h-4 pm-icon-hover" />
      </div>
    </div>
  );
};

