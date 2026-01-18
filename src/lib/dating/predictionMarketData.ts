export interface PredictionMarket {
  id: string;
  type: 'dates_to_match' | 'compatibility_probability' | 'first_match_timing' | 'compatibility_ranking';
  title: string;
  description: string;
  participants: string[]; // User IDs
  participantNames: string[]; // User names for display
  currentOdds?: {
    option: string;
    probability: number; // 0-1
    odds: string; // e.g., "3:1"
  }[];
  marketData: {
    totalVolume: number;
    totalBets: number;
    closingTime?: string; // ISO date string
    resolutionCriteria: string;
  };
  status: 'active' | 'closed' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export const mockPredictionMarkets: PredictionMarket[] = [
  {
    id: 'pred-1',
    type: 'dates_to_match',
    title: 'How many dates will it take for Viktor Chaos to find his perfect match?',
    description: 'Predict the number of dates Viktor Chaos will go on before finding a match with compatibility rating ≥ 8.0',
    participants: ['user-chaos-1'],
    participantNames: ['Viktor Chaos'],
    currentOdds: [
      { option: '1-2 dates', probability: 0.08, odds: '11.5:1' },
      { option: '3-4 dates', probability: 0.22, odds: '3.5:1' },
      { option: '5-6 dates', probability: 0.35, odds: '1.9:1' },
      { option: '7+ dates', probability: 0.35, odds: '1.9:1' },
    ],
    marketData: {
      totalVolume: 1250,
      totalBets: 47,
      resolutionCriteria: 'First date with compatibility rating ≥ 8.0',
    },
    status: 'active',
    createdAt: '2026-01-18T00:00:00.000Z',
    updatedAt: '2026-01-18T10:30:00.000Z',
  },
  {
    id: 'pred-2',
    type: 'compatibility_probability',
    title: 'Will Luna Meadows and Marcus Chen be the most compatible pair?',
    description: 'Probability that Luna Meadows and Marcus Chen achieve the highest compatibility rating among all pairs',
    participants: ['user-gentle-2', 'user-tech-3'],
    participantNames: ['Luna Meadows', 'Marcus Chen'],
    currentOdds: [
      { option: 'Yes', probability: 0.28, odds: '2.6:1' },
      { option: 'No', probability: 0.72, odds: '0.4:1' },
    ],
    marketData: {
      totalVolume: 2100,
      totalBets: 89,
      resolutionCriteria: 'Highest compatibility rating among all completed dates',
    },
    status: 'active',
    createdAt: '2026-01-18T00:00:00.000Z',
    updatedAt: '2026-01-18T11:15:00.000Z',
  },
  {
    id: 'pred-3',
    type: 'compatibility_probability',
    title: 'Will Diamond Jackson and Frank Morrison be the least compatible pair?',
    description: 'Probability that Diamond Jackson and Frank Morrison achieve the lowest compatibility rating among all pairs',
    participants: ['user-queen-4', 'user-grumpy-7'],
    participantNames: ['Diamond Jackson', 'Frank Morrison'],
    currentOdds: [
      { option: 'Yes', probability: 0.45, odds: '1.2:1' },
      { option: 'No', probability: 0.55, odds: '0.8:1' },
    ],
    marketData: {
      totalVolume: 1850,
      totalBets: 42,
      resolutionCriteria: 'Lowest compatibility rating among all completed dates',
    },
    status: 'active',
    createdAt: '2026-01-18T00:00:00.000Z',
    updatedAt: '2026-01-18T09:45:00.000Z',
  },
  {
    id: 'pred-4',
    type: 'dates_to_match',
    title: 'How many dates will it take for Poppy Delgado to find her perfect match?',
    description: 'Predict the number of dates Poppy Delgado will go on before finding a match with compatibility rating ≥ 8.0',
    participants: ['user-sunshine-8'],
    participantNames: ['Poppy Delgado'],
    currentOdds: [
      { option: '1-2 dates', probability: 0.35, odds: '1.9:1' },
      { option: '3-4 dates', probability: 0.40, odds: '1.5:1' },
      { option: '5-6 dates', probability: 0.20, odds: '4:1' },
      { option: '7+ dates', probability: 0.05, odds: '19:1' },
    ],
    marketData: {
      totalVolume: 980,
      totalBets: 38,
      resolutionCriteria: 'First date with compatibility rating ≥ 8.0',
    },
    status: 'active',
    createdAt: '2026-01-18T01:00:00.000Z',
    updatedAt: '2026-01-18T10:00:00.000Z',
  },
  {
    id: 'pred-5',
    type: 'first_match_timing',
    title: 'When will Kai Blackwood have his first date?',
    description: 'Predict when Kai Blackwood will go on his first date (within the next 24 hours)',
    participants: ['user-mysterious-9'],
    participantNames: ['Kai Blackwood'],
    currentOdds: [
      { option: 'Within 1 hour', probability: 0.10, odds: '9:1' },
      { option: '1-6 hours', probability: 0.35, odds: '1.9:1' },
      { option: '6-12 hours', probability: 0.30, odds: '2.3:1' },
      { option: '12-24 hours', probability: 0.25, odds: '3:1' },
    ],
    marketData: {
      totalVolume: 650,
      totalBets: 24,
      closingTime: '2026-01-19T00:00:00.000Z',
      resolutionCriteria: 'First scheduled date timestamp',
    },
    status: 'active',
    createdAt: '2026-01-18T08:00:00.000Z',
    updatedAt: '2026-01-18T08:00:00.000Z',
  },
  {
    id: 'pred-6',
    type: 'compatibility_ranking',
    title: 'Who will Valentina Rossi be most compatible with?',
    description: 'Predict which user will achieve the highest compatibility rating with Valentina Rossi',
    participants: ['user-dramatic-10'],
    participantNames: ['Valentina Rossi'],
    currentOdds: [
      { option: 'Darius Wright', probability: 0.32, odds: '2.1:1' },
      { option: 'Oliver Fitzgerald', probability: 0.25, odds: '3:1' },
      { option: 'Marcus Chen', probability: 0.20, odds: '4:1' },
      { option: 'Kai Blackwood', probability: 0.15, odds: '5.7:1' },
      { option: 'Other', probability: 0.08, odds: '11.5:1' },
    ],
    marketData: {
      totalVolume: 1750,
      totalBets: 62,
      resolutionCriteria: 'Highest compatibility rating with Valentina Rossi',
    },
    status: 'active',
    createdAt: '2026-01-18T02:00:00.000Z',
    updatedAt: '2026-01-18T11:00:00.000Z',
  },
  {
    id: 'pred-7',
    type: 'compatibility_probability',
    title: 'Will Zara Nightingale and Oliver Fitzgerald achieve compatibility ≥ 7.0?',
    description: 'Probability that Zara Nightingale and Oliver Fitzgerald achieve a compatibility rating of 7.0 or higher',
    participants: ['user-wild-6', 'user-nerd-5'],
    participantNames: ['Zara Nightingale', 'Oliver Fitzgerald'],
    currentOdds: [
      { option: 'Yes', probability: 0.38, odds: '1.6:1' },
      { option: 'No', probability: 0.62, odds: '0.6:1' },
    ],
    marketData: {
      totalVolume: 1420,
      totalBets: 55,
      resolutionCriteria: 'Compatibility rating ≥ 7.0 on first date',
    },
    status: 'active',
    createdAt: '2026-01-18T03:00:00.000Z',
    updatedAt: '2026-01-18T10:45:00.000Z',
  },
  {
    id: 'pred-8',
    type: 'dates_to_match',
    title: 'How many dates will it take for Meredith Bloom to find her perfect match?',
    description: 'Predict the number of dates Meredith Bloom will go on before finding a match with compatibility rating ≥ 8.0',
    participants: ['user-awkward-12'],
    participantNames: ['Meredith Bloom'],
    currentOdds: [
      { option: '1-2 dates', probability: 0.12, odds: '7.3:1' },
      { option: '3-4 dates', probability: 0.30, odds: '2.3:1' },
      { option: '5-6 dates', probability: 0.35, odds: '1.9:1' },
      { option: '7+ dates', probability: 0.23, odds: '3.3:1' },
    ],
    marketData: {
      totalVolume: 1100,
      totalBets: 41,
      resolutionCriteria: 'First date with compatibility rating ≥ 8.0',
    },
    status: 'active',
    createdAt: '2026-01-18T04:00:00.000Z',
    updatedAt: '2026-01-18T10:20:00.000Z',
  },
];
