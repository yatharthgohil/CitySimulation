import type { DateSession } from './orchestrator';
import type { UserProfile } from '@/lib/userDatabase';
import { getUserById } from '@/lib/userDatabase';

interface CompatibilityAnalysis {
  insight: string;
  confidenceTrend: 'rising' | 'falling' | 'stable' | 'volatile';
  relationshipStage: string;
  overallFeeling: string;
  isPerfectMatch?: boolean;
}

/**
 * Generate comprehensive compatibility insight - a mega summary that analyzes:
 * - All date summaries with confidence levels
 * - Emotional values and patterns
 * - Personality traits comparison
 * - Perfect balance assessment
 */
export async function generateCompatibilityInsight(
  agentId: string,
  partnerId: string,
  dates: DateSession[]
): Promise<CompatibilityAnalysis> {
  // Get user profiles
  const agent = await getUserById(agentId);
  const partner = await getUserById(partnerId);
  
  // Filter and sort dates with this partner
  const partnerDates = dates
    .filter(d =>
      ((d.user1Id === agentId && d.user2Id === partnerId) ||
       (d.user1Id === partnerId && d.user2Id === agentId)) &&
      d.status === 'completed'
    )
    .sort((a, b) => a.endTime.getTime() - b.endTime.getTime());

  if (partnerDates.length === 0) {
    return {
      insight: 'No dates completed yet. The relationship is just beginning to unfold.',
      confidenceTrend: 'stable',
      relationshipStage: 'Initial Stage',
      overallFeeling: 'Uncertain'
    };
  }

  // Analyze confidence scores
  const datesWithConfidence = partnerDates.filter(d => d.confidence !== undefined);
  const confidences = datesWithConfidence.map(d => d.confidence!);
  const avgConfidence = confidences.length > 0 
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length 
    : 0.5;

  // Determine trend and stability
  let confidenceTrend: 'rising' | 'falling' | 'stable' | 'volatile' = 'stable';
  
  if (confidences.length >= 2) {
    const firstHalf = confidences.slice(0, Math.ceil(confidences.length / 2));
    const secondHalf = confidences.slice(Math.ceil(confidences.length / 2));
    const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trendDiff = secondHalfAvg - firstHalfAvg;
    
    if (Math.abs(trendDiff) < 0.05) {
      // Check volatility
      const variance = confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidences.length;
      const stdDev = Math.sqrt(variance);
      confidenceTrend = stdDev > 0.15 ? 'volatile' : 'stable';
    } else {
      confidenceTrend = trendDiff > 0 ? 'rising' : 'falling';
    }
  }

  // Analyze date summaries for emotional patterns and key themes
  const summaries = partnerDates
    .filter(d => d.summary)
    .map((d, index) => ({
      summary: d.summary!,
      confidence: d.confidence || 0.5,
      index,
      sentiment: d.sentiment || 'Neutral'
    }));

  // Extract emotional keywords from summaries
  const emotionalKeywords = {
    positive: ['happy', 'joy', 'excited', 'comfortable', 'at ease', 'warm', 'genuine', 'authentic', 'connected', 'understood'],
    negative: ['awkward', 'uncomfortable', 'tense', 'worried', 'concerned', 'confused', 'disappointed', 'uncertain'],
    compatibility: ['clicked', 'aligned', 'shared', 'common', 'similar', 'compatible', 'understood', 'resonated'],
    conflict: ['disagreed', 'different', 'mismatch', 'contrasting', 'conflicting', 'divergent']
  };

  let positiveEmotions = 0;
  let negativeEmotions = 0;
  let compatibilitySignals = 0;
  let conflictSignals = 0;

  summaries.forEach(({ summary }) => {
    const lowerSummary = summary.toLowerCase();
    emotionalKeywords.positive.forEach(keyword => {
      if (lowerSummary.includes(keyword)) positiveEmotions++;
    });
    emotionalKeywords.negative.forEach(keyword => {
      if (lowerSummary.includes(keyword)) negativeEmotions++;
    });
    emotionalKeywords.compatibility.forEach(keyword => {
      if (lowerSummary.includes(keyword)) compatibilitySignals++;
    });
    emotionalKeywords.conflict.forEach(keyword => {
      if (lowerSummary.includes(keyword)) conflictSignals++;
    });
  });

  // Analyze personality traits from user profiles
  let personalityAnalysis = '';
  if (agent && partner) {
    const ageDifference = Math.abs(agent.age - partner.age);
    const ageCompatible = ageDifference <= 10;
    
    // Compare preferences/interests
    const agentInterests = agent.preferences?.toLowerCase() || '';
    const partnerInterests = partner.preferences?.toLowerCase() || '';
    
    const interestOverlap = agentInterests && partnerInterests
      ? extractCommonInterests(agentInterests, partnerInterests)
      : [];

    personalityAnalysis = `When considering their personalities, `;
    
    if (ageCompatible) {
      personalityAnalysis += `their ages are well-matched, creating a natural alignment in life stage. `;
    } else {
      personalityAnalysis += `there's a notable age difference that could impact long-term compatibility. `;
    }

    if (interestOverlap.length > 0) {
      personalityAnalysis += `They share common interests in ${interestOverlap.slice(0, 3).join(', ')}, which creates natural conversation topics and activities they can enjoy together. `;
    } else if (agent.preferences && partner.preferences) {
      personalityAnalysis += `Their interests diverge, which could provide complementary perspectives but may require more effort to find common ground. `;
    }
  }

  // Determine relationship stage
  let relationshipStage = '';
  let overallFeeling = '';
  
  if (partnerDates.length <= 3) {
    relationshipStage = 'Early Exploration';
    overallFeeling = avgConfidence > 0.7 ? 'Optimistic' : avgConfidence > 0.5 ? 'Cautiously Positive' : 'Uncertain';
  } else if (partnerDates.length <= 7) {
    relationshipStage = 'Getting to Know Each Other';
    overallFeeling = avgConfidence > 0.7 ? 'Growing Comfort' : avgConfidence > 0.5 ? 'Mixed Feelings' : 'Reservations';
  } else if (partnerDates.length <= 12) {
    relationshipStage = 'Deepening Connection';
    overallFeeling = avgConfidence > 0.7 ? 'Strong Bond Developing' : avgConfidence > 0.5 ? 'Finding Balance' : 'Questioning Compatibility';
  } else {
    relationshipStage = 'Established Relationship';
    overallFeeling = avgConfidence > 0.7 ? 'Solid Foundation' : avgConfidence > 0.5 ? 'Stable but Uncertain' : 'Struggling';
  }

  // Generate comprehensive insight text - MEGA SUMMARY
  let insight = `Through ${partnerDates.length} date${partnerDates.length > 1 ? 's' : ''}, `;

  // Analyze confidence trajectory with detail
  if (confidenceTrend === 'stable' && avgConfidence > 0.7) {
    insight += `the relationship has maintained a remarkably consistent and high level of connection, with confidence scores hovering around ${(avgConfidence * 100).toFixed(0)}%. `;
    insight += `This stability suggests deep compatibility - conversations flow naturally, comfort levels remain elevated, and both parties feel genuinely understood. `;
  } else if (confidenceTrend === 'stable' && avgConfidence > 0.5) {
    insight += `the dynamic has remained relatively steady, with confidence consistently around ${(avgConfidence * 100).toFixed(0)}%. `;
    insight += `There's a pattern of good moments mixed with some uncertainty - the relationship shows promise but may require more time to fully blossom. `;
  } else if (confidenceTrend === 'rising' && avgConfidence > 0.7) {
    insight += `the connection has steadily strengthened, with confidence climbing from early dates to now averaging ${(avgConfidence * 100).toFixed(0)}%. `;
    insight += `Each interaction builds upon the previous, creating a foundation of trust and understanding that feels both exciting and secure. `;
  } else if (confidenceTrend === 'rising' && avgConfidence > 0.5) {
    insight += `there's been a gradual improvement in how things feel together, with confidence trending upward. `;
    insight += `Early uncertainties are giving way to moments of genuine connection, suggesting they're discovering their rhythm as a pair. `;
  } else if (confidenceTrend === 'falling') {
    insight += `the initial spark has gradually faded, with confidence declining over time. `;
    insight += `What once felt promising has become clouded with doubts, indicating that fundamental compatibility may not be present despite initial hopes. `;
  } else if (confidenceTrend === 'volatile') {
    insight += `the relationship has been marked by significant ups and downs in confidence. `;
    insight += `There are moments of strong connection followed by uncertainty, creating an emotional rollercoaster that suggests chemistry exists but stability remains elusive. `;
  }

  // Analyze emotional patterns from summaries
  if (positiveEmotions > negativeEmotions * 2) {
    insight += `The emotional tone across dates has been predominantly positive - there's genuine joy, comfort, and ease in their interactions. `;
  } else if (positiveEmotions > negativeEmotions) {
    insight += `The emotional landscape shows more positive than negative moments, suggesting potential despite some challenges. `;
  } else if (negativeEmotions > positiveEmotions) {
    insight += `However, the emotional pattern reveals more discomfort and tension than warmth, which raises concerns about long-term compatibility. `;
  }

  // Compatibility signals
  if (compatibilitySignals > conflictSignals * 2) {
    insight += `Strong compatibility signals emerge from their conversations - they've clicked, found common ground, and genuinely understood each other's perspectives. `;
  } else if (compatibilitySignals > conflictSignals) {
    insight += `There are compatibility signals present, though they're balanced with some differences in perspective or approach. `;
  } else if (conflictSignals > compatibilitySignals) {
    insight += `The summaries reveal more conflicts and mismatches than alignment, suggesting fundamental differences that may be difficult to reconcile. `;
  }

  // Add personality analysis
  if (personalityAnalysis) {
    insight += personalityAnalysis;
  }

  // Perfect balance assessment
  const perfectBalanceScore = calculatePerfectBalance(
    avgConfidence,
    positiveEmotions,
    negativeEmotions,
    compatibilitySignals,
    conflictSignals,
    confidenceTrend
  );

  if (perfectBalanceScore > 0.8) {
    insight += `The evidence points to an exceptional balance - high confidence, positive emotions, strong compatibility signals, and stable patterns all align to suggest this could be a truly harmonious match. `;
  } else if (perfectBalanceScore > 0.6) {
    insight += `There's a solid balance emerging between their personalities and connection style, though some areas may need continued attention. `;
  } else if (perfectBalanceScore > 0.4) {
    insight += `The balance feels somewhat uneven - there are good elements but also gaps that need addressing for this relationship to reach its potential. `;
  } else {
    insight += `The balance appears off - compatibility signals are weak, emotional patterns are mixed, and confidence isn't building in a way that suggests long-term success. `;
  }

  // Add relationship stage context
  insight += `At this ${relationshipStage.toLowerCase()} phase, ${overallFeeling.toLowerCase()} best describes how things are progressing. `;

  // Add feeling/emotion context based on all data
  if (avgConfidence > 0.75 && positiveEmotions > negativeEmotions * 2 && compatibilitySignals > conflictSignals * 2) {
    insight += `There's a profound sense of ease and authenticity - conversations feel natural, silences are comfortable, and there's genuine mutual interest that transcends surface-level attraction. `;
    insight += `The alignment between their emotional needs, personality traits, and communication styles creates a foundation that feels both exciting and secure. `;
  } else if (avgConfidence > 0.65) {
    insight += `There's cautious optimism - moments of connection feel real and meaningful, but some questions remain about long-term compatibility and whether the balance they've found can be sustained. `;
  } else if (avgConfidence > 0.45) {
    insight += `The relationship feels uncertain - there are good moments, but fundamental differences in personality, communication style, or emotional needs are becoming apparent. `;
  } else {
    insight += `There's a sense that the connection isn't deepening as hoped - compatibility seems limited, emotional patterns are concerning, and the relationship may not have the foundation to flourish long-term. `;
  }

  return {
    insight,
    confidenceTrend,
    relationshipStage,
    overallFeeling
  };
}

/**
 * Extract common interests from two preference strings
 */
function extractCommonInterests(agentInterests: string, partnerInterests: string): string[] {
  const agentWords = agentInterests.split(/\s+/).filter(w => w.length > 3);
  const partnerWords = partnerInterests.split(/\s+/).filter(w => w.length > 3);
  
  const common = agentWords.filter(word => 
    partnerWords.some(pword => 
      word.toLowerCase().includes(pword.toLowerCase()) || 
      pword.toLowerCase().includes(word.toLowerCase())
    )
  );
  
  return [...new Set(common)].slice(0, 5);
}

/**
 * Calculate perfect balance score based on multiple factors
 */
function calculatePerfectBalance(
  avgConfidence: number,
  positiveEmotions: number,
  negativeEmotions: number,
  compatibilitySignals: number,
  conflictSignals: number,
  confidenceTrend: 'rising' | 'falling' | 'stable' | 'volatile'
): number {
  let score = 0;

  // Confidence weight (40%)
  score += avgConfidence * 0.4;

  // Emotional balance weight (25%)
  const totalEmotions = positiveEmotions + negativeEmotions || 1;
  const emotionalBalance = positiveEmotions / totalEmotions;
  score += emotionalBalance * 0.25;

  // Compatibility signals weight (25%)
  const totalSignals = compatibilitySignals + conflictSignals || 1;
  const compatibilityRatio = compatibilitySignals / totalSignals;
  score += compatibilityRatio * 0.25;

  // Trend weight (10%)
  if (confidenceTrend === 'stable' || confidenceTrend === 'rising') {
    score += 0.1;
  }

  return Math.min(1, score);
}
