'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface Topic {
  name: string;
  active?: boolean;
}

interface TopicFiltersProps {
  topics?: Topic[];
  onFilterChange?: (topic: string) => void;
}

const defaultTopics: Topic[] = [
  { name: 'All', active: true },
  { name: 'Compatibility', active: false },
  { name: 'First Match', active: false },
  { name: 'Dating Timeline', active: false },
  { name: 'Rankings', active: false },
  { name: 'High Volume', active: false },
];

export const TopicFilters = ({ topics = defaultTopics, onFilterChange }: TopicFiltersProps) => {
  const [activeFilter, setActiveFilter] = useState(topics.find(t => t.active)?.name || 'All');

  const handleFilterClick = (topic: string) => {
    setActiveFilter(topic);
    onFilterChange?.(topic);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
      {topics.map((topic) => (
        <button
          key={topic.name}
          onClick={() => handleFilterClick(topic.name)}
          className={activeFilter === topic.name ? 'pm-pill-active' : 'pm-pill'}
        >
          {topic.name}
        </button>
      ))}
      <button className="text-muted-foreground hover:text-foreground ml-2 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

