'use client';

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { 
  PredictionCard, 
  MultiOptionCard, 
  DateOptionCard, 
  TopicFilters 
} from '@/components/predictions';
import { mockPredictionMarkets, type PredictionMarket } from '@/lib/dating/predictionMarketData';

const PolymarketLogo = () => (
  <svg width="34" height="34" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M24.22 31.88c0 1.26 0 1.89-.412 2.202s-1.018.142-2.231-.199l-19.493-5.47c-.731-.205-1.096-.307-1.308-.586s-.211-.658-.211-1.417V13.59c0-.759 0-1.138.211-1.417.212-.279.577-.381 1.308-.586l19.493-5.47c1.213-.34 1.82-.511 2.231-.199.412.313.412.943.412 2.202zM5.426 26.63l16.14 4.53V22.1zm-2.208-2.101L19.356 20 3.217 15.471zM5.426 13.37l16.14 4.53V8.84z" 
      fill="currentColor"
    />
  </svg>
);

const formatVolume = (volume: number): string => {
  if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}m`;
  if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}k`;
  return `$${volume}`;
};

const topics = [
  { name: 'All', active: true },
  { name: 'Compatibility', active: false },
  { name: 'First Match', active: false },
  { name: 'Dating Timeline', active: false },
  { name: 'Rankings', active: false },
];

export function PredictionsPanel() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMarkets = useMemo(() => {
    let markets = mockPredictionMarkets;
    
    if (activeFilter !== 'All') {
      const filterMap: Record<string, PredictionMarket['type'][]> = {
        'Compatibility': ['compatibility_probability'],
        'First Match': ['first_match_timing'],
        'Dating Timeline': ['dates_to_match'],
        'Rankings': ['compatibility_ranking'],
      };
      
      const types = filterMap[activeFilter];
      if (types) {
        markets = markets.filter(m => types.includes(m.type));
      }
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      markets = markets.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.participantNames.some(name => name.toLowerCase().includes(query))
      );
    }
    
    return markets;
  }, [activeFilter, searchQuery]);

  const renderCard = (market: PredictionMarket) => {
    const volume = formatVolume(market.marketData.totalVolume);

    if (market.type === 'compatibility_probability' && 
        market.currentOdds?.length === 2 && 
        market.currentOdds[0].option === 'Yes') {
      const yesProb = Math.round(market.currentOdds[0].probability * 100);
      return (
        <PredictionCard
          key={market.id}
          title={market.title}
          percentage={yesProb}
          volume={volume}
        />
      );
    }

    if (market.type === 'first_match_timing') {
      const options = market.currentOdds?.map(odd => ({
        date: odd.option,
        percentage: Math.round(odd.probability * 100),
      })) || [];
      return (
        <DateOptionCard
          key={market.id}
          title={market.title}
          options={options.slice(0, 2)}
          volume={volume}
        />
      );
    }

    const options = market.currentOdds?.map(odd => ({
      name: odd.option,
      percentage: Math.round(odd.probability * 100),
    })) || [];
    
    return (
      <MultiOptionCard
        key={market.id}
        title={market.title}
        options={options.slice(0, 2)}
        volume={volume}
      />
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <header className="pm-header">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center text-foreground">
              <PolymarketLogo />
            </div>
            <span className="text-foreground text-xl font-semibold">Polymarket</span>
          </div>

          <div className="flex-1 max-w-md mx-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pm-search-input"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{filteredMarkets.length} markets</span>
          </div>
        </div>
      </header>

      <TopicFilters 
        topics={topics} 
        onFilterChange={setActiveFilter} 
      />

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMarkets.map(market => renderCard(market))}
        </div>

        {filteredMarkets.length === 0 && (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No predictions found for this filter.
          </div>
        )}
      </div>
    </div>
  );
}
