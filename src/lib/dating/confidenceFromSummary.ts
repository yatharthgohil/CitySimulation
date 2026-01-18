/**
 * Calculate confidence score from date summary text
 * Analyzes sentiment, keywords, and overall tone to derive confidence (0-1)
 */

export function calculateConfidenceFromSummary(summary: string): number {
  if (!summary || summary.trim().length === 0) {
    return 0.5; // Default neutral confidence
  }

  const text = summary.toLowerCase();
  let score = 0.5; // Start neutral
  
  // Positive indicators (increase confidence)
  const positivePhrases = [
    'great connection', 'strong chemistry', 'compatible', 'enjoyed',
    'wonderful', 'amazing', 'excellent', 'fantastic', 'clicked',
    'easy conversation', 'felt comfortable', 'shared interests',
    'good vibe', 'positive', 'promising', 'potential',
    'genuine', 'authentic', 'natural', 'flowed well',
    'meshed well', 'had fun', 'laugh', 'smile',
    'similar values', 'aligned', 'on the same page'
  ];

  // Negative indicators (decrease confidence)
  const negativePhrases = [
    'uncomfortable', 'awkward', 'didn\'t connect', 'not compatible',
    'disappointing', 'lack of', 'struggled', 'difficult',
    'tense', 'forced', 'unclear', 'uncertain',
    'disagree', 'conflict', 'red flags', 'concerns',
    'reservations', 'hesitant', 'not sure', 'mixed feelings'
  ];

  // Count positive phrases
  const positiveCount = positivePhrases.filter(phrase => text.includes(phrase)).length;
  
  // Count negative phrases
  const negativeCount = negativePhrases.filter(phrase => text.includes(phrase)).length;

  // Calculate base score from phrase matching
  const phraseScore = (positiveCount * 0.15) - (negativeCount * 0.15);
  score += phraseScore;

  // Analyze overall sentiment from common positive/negative words
  const positiveWords = ['great', 'good', 'nice', 'love', 'enjoy', 'happy', 'excited', 'interested'];
  const negativeWords = ['bad', 'poor', 'disappoint', 'uncomfortable', 'awkward', 'boring', 'worried'];

  const positiveWordCount = positiveWords.filter(word => text.includes(word)).length;
  const negativeWordCount = negativeWords.filter(word => text.includes(word)).length;

  const wordScore = ((positiveWordCount - negativeWordCount) * 0.02);
  score += wordScore;

  // Check for length indicators (detailed positive summaries tend to be longer)
  if (text.length > 150 && positiveCount > 2) {
    score += 0.05; // Detailed positive summary bonus
  }

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, score));
}

