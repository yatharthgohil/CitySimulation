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
    title: 'How many dates will it take for Randy Orton to find his perfect match?',
    description: 'Predict the number of dates Randy Orton will go on before finding a match with compatibility rating ≥ 8.0',
    participants: ['user-wwe-7'],
    participantNames: ['Randy Orton'],
    currentOdds: [
      { option: '1-2 dates', probability: 0.15, odds: '5.7:1' },
      { option: '3-4 dates', probability: 0.35, odds: '1.9:1' },
      { option: '5-6 dates', probability: 0.30, odds: '2.3:1' },
      { option: '7+ dates', probability: 0.20, odds: '4:1' },
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
    title: 'Will Roman Reigns and Bianca Belair be the most compatible pair?',
    description: 'Probability that Roman Reigns and Bianca Belair achieve the highest compatibility rating among all pairs',
    participants: ['user-wwe-5', 'user-wwe-8'],
    participantNames: ['Roman Reigns', 'Bianca Belair'],
    currentOdds: [
      { option: 'Yes', probability: 0.42, odds: '1.4:1' },
      { option: 'No', probability: 0.58, odds: '0.7:1' },
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
    title: 'Will Roman Reigns and Bianca Belair be the least compatible pair?',
    description: 'Probability that Roman Reigns and Bianca Belair achieve the lowest compatibility rating among all pairs',
    participants: ['user-wwe-5', 'user-wwe-8'],
    participantNames: ['Roman Reigns', 'Bianca Belair'],
    currentOdds: [
      { option: 'Yes', probability: 0.18, odds: '4.6:1' },
      { option: 'No', probability: 0.82, odds: '0.2:1' },
    ],
    marketData: {
      totalVolume: 850,
      totalBets: 32,
      resolutionCriteria: 'Lowest compatibility rating among all completed dates',
    },
    status: 'active',
    createdAt: '2026-01-18T00:00:00.000Z',
    updatedAt: '2026-01-18T09:45:00.000Z',
  },
  {
    id: 'pred-4',
    type: 'dates_to_match',
    title: 'How many dates will it take for John Cena to find his perfect match?',
    description: 'Predict the number of dates John Cena will go on before finding a match with compatibility rating ≥ 8.0',
    participants: ['user-wwe-1'],
    participantNames: ['John Cena'],
    currentOdds: [
      { option: '1-2 dates', probability: 0.25, odds: '3:1' },
      { option: '3-4 dates', probability: 0.40, odds: '1.5:1' },
      { option: '5-6 dates', probability: 0.25, odds: '3:1' },
      { option: '7+ dates', probability: 0.10, odds: '9:1' },
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
    title: 'When will The Rock have his first date?',
    description: 'Predict when The Rock will go on his first date (within the next 24 hours)',
    participants: ['user-wwe-2'],
    participantNames: ['The Rock'],
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
    title: 'Who will Becky Lynch be most compatible with?',
    description: 'Predict which user will achieve the highest compatibility rating with Becky Lynch',
    participants: ['user-wwe-3'],
    participantNames: ['Becky Lynch'],
    currentOdds: [
      { option: 'John Cena', probability: 0.28, odds: '2.6:1' },
      { option: 'The Rock', probability: 0.22, odds: '3.5:1' },
      { option: 'Roman Reigns', probability: 0.20, odds: '4:1' },
      { option: 'Randy Orton', probability: 0.18, odds: '4.6:1' },
      { option: 'Other', probability: 0.12, odds: '7.3:1' },
    ],
    marketData: {
      totalVolume: 1750,
      totalBets: 62,
      resolutionCriteria: 'Highest compatibility rating with Becky Lynch',
    },
    status: 'active',
    createdAt: '2026-01-18T02:00:00.000Z',
    updatedAt: '2026-01-18T11:00:00.000Z',
  },
  {
    id: 'pred-7',
    type: 'compatibility_probability',
    title: 'Will Charlotte Flair and Randy Orton achieve compatibility ≥ 7.0?',
    description: 'Probability that Charlotte Flair and Randy Orton achieve a compatibility rating of 7.0 or higher',
    participants: ['user-wwe-4', 'user-wwe-7'],
    participantNames: ['Charlotte Flair', 'Randy Orton'],
    currentOdds: [
      { option: 'Yes', probability: 0.65, odds: '0.5:1' },
      { option: 'No', probability: 0.35, odds: '1.9:1' },
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
    title: 'How many dates will it take for Sasha Banks to find her perfect match?',
    description: 'Predict the number of dates Sasha Banks will go on before finding a match with compatibility rating ≥ 8.0',
    participants: ['user-wwe-6'],
    participantNames: ['Sasha Banks'],
    currentOdds: [
      { option: '1-2 dates', probability: 0.20, odds: '4:1' },
      { option: '3-4 dates', probability: 0.38, odds: '1.6:1' },
      { option: '5-6 dates', probability: 0.28, odds: '2.6:1' },
      { option: '7+ dates', probability: 0.14, odds: '6.1:1' },
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

