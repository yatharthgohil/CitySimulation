import { datingEventBus, DateSession } from './orchestrator';

/**
 * Detects perfect match based on stable confidence pattern:
 * - 5 consecutive dates with STABLE confidence (same percentage range)
 * - Then 3 more test dates
 * - If confidence stays high enough like the stable ones → PERFECT MATCH
 */
export class BestMatchDetector {
  private readonly STABILITY_RANGE = 0.05; // Confidence must stay within 5% range to be considered "stable"
  private readonly CONSECUTIVE_STABLE_DATES_REQUIRED = 5;
  private readonly TEST_DATES_REQUIRED = 3;
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.65; // Minimum for stable dates to be considered

  /**
   * Check if dates indicate a perfect match for an agent-partner pair
   * Stable confidence = confidence stays around the same percentage (±5%)
   */
  checkBestMatch(
    agentId: string,
    partnerId: string,
    dates: DateSession[]
  ): { isBestMatch: boolean; consecutiveStable: number; testDates: number; stableRange?: { min: number; max: number } } {
    // Filter dates with this partner and sort by time
    const partnerDates = dates
      .filter(d => 
        (d.user1Id === agentId && d.user2Id === partnerId) ||
        (d.user1Id === partnerId && d.user2Id === agentId)
      )
      .filter(d => d.confidence !== undefined && d.status === 'completed')
      .sort((a, b) => a.endTime.getTime() - b.endTime.getTime());

    if (partnerDates.length < this.CONSECUTIVE_STABLE_DATES_REQUIRED + this.TEST_DATES_REQUIRED) {
      return { isBestMatch: false, consecutiveStable: 0, testDates: 0 };
    }

    // Find 5 consecutive dates with STABLE confidence (same percentage range)
    for (let i = 0; i <= partnerDates.length - this.CONSECUTIVE_STABLE_DATES_REQUIRED; i++) {
      const stableGroup = partnerDates.slice(i, i + this.CONSECUTIVE_STABLE_DATES_REQUIRED);
      const stableConfidences = stableGroup.map(d => d.confidence!);

      // Check if all confidences are within the stability range
      const avgConfidence = stableConfidences.reduce((a, b) => a + b, 0) / stableConfidences.length;
      
      // Must be high enough confidence
      if (avgConfidence < this.HIGH_CONFIDENCE_THRESHOLD) {
        continue;
      }

      // Check if all dates are stable (within ±5% of average)
      const minStable = avgConfidence - this.STABILITY_RANGE;
      const maxStable = avgConfidence + this.STABILITY_RANGE;

      const allStable = stableConfidences.every(
        conf => conf >= minStable && conf <= maxStable
      );

      if (allStable) {
        // Found 5 consecutive stable dates - now check for 3 test dates after
        const testDatesStartIndex = i + this.CONSECUTIVE_STABLE_DATES_REQUIRED;
        const testDates = partnerDates.slice(
          testDatesStartIndex,
          testDatesStartIndex + this.TEST_DATES_REQUIRED
        );

        if (testDates.length >= this.TEST_DATES_REQUIRED) {
          // Check if test dates maintain high confidence similar to stable ones
          const testConfidences = testDates.map(d => d.confidence!);
          const avgTestConfidence = testConfidences.reduce((a, b) => a + b, 0) / testConfidences.length;

          // Test dates should:
          // 1. Stay high (above threshold)
          // 2. Be within a reasonable range of the stable confidence (within ±10%)
          const testMin = avgConfidence - 0.10; // Wider range for test dates
          const testMax = avgConfidence + 0.10;

          const allTestDatesHigh = testConfidences.every(
            conf => conf >= this.HIGH_CONFIDENCE_THRESHOLD
          );

          const testDatesInRange = avgTestConfidence >= testMin && avgTestConfidence <= testMax;

          // Perfect match found!
          if (allTestDatesHigh && testDatesInRange) {
            return { 
              isBestMatch: true, 
              consecutiveStable: this.CONSECUTIVE_STABLE_DATES_REQUIRED, 
              testDates: testDates.length,
              stableRange: { min: minStable, max: maxStable }
            };
          }
        }
      }
    }

    return { isBestMatch: false, consecutiveStable: 0, testDates: 0 };
  }

  /**
   * Check all dates for a user and emit best match events
   */
  checkAndEmitBestMatches(userId: string, allDates: DateSession[]): void {
    // Get unique partners
    const partners = new Set<string>();
    allDates.forEach(date => {
      if (date.user1Id === userId) partners.add(date.user2Id);
      if (date.user2Id === userId) partners.add(date.user1Id);
    });

    // Check each partner
    for (const partnerId of partners) {
      const result = this.checkBestMatch(userId, partnerId, allDates);
      
      if (result.isBestMatch) {
        const partnerDates = allDates.filter(d =>
          ((d.user1Id === userId && d.user2Id === partnerId) ||
           (d.user1Id === partnerId && d.user2Id === userId)) &&
          d.status === 'completed'
        );
        
        const partnerName = partnerDates[0]?.user1Id === userId 
          ? partnerDates[0].user2Name 
          : partnerDates[0].user1Name;

        datingEventBus.emit('bestMatch', {
          agentId: userId,
          partnerId: partnerId,
          partnerName: partnerName,
          totalDates: partnerDates.length,
          consecutiveStable: result.consecutiveStable,
          testDates: result.testDates,
          stableRange: result.stableRange,
          message: `Perfect Match Found! After 5 consecutive dates with stable confidence around ${result.stableRange ? ((result.stableRange.min + result.stableRange.max) / 2 * 100).toFixed(0) : 'high'}%, followed by 3 test dates that maintained high compatibility, ${partnerName} has been identified as the best match.`
        });
      }
    }
  }
}

export const bestMatchDetector = new BestMatchDetector();
