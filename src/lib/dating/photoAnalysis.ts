/**
 * Photo Analysis Service using Overshoot SDK
 * Analyzes user photos to build in-depth character profiles
 */

export interface IOSCharacterSummary {
  traits: string[];
  personality: string;
  interests: string[];
  characteristics: string;
}

export interface VisualAnalysisResult {
  detectedInterests: string[];
  personalityHints: string[];
  lifestyleIndicators: string[];
  visualStyle: string;
  activitySignals: string[];
  socialContext: string;
  confidence: number;
}

export interface DeepCharacterProfile {
  // From iOS
  iosSummary: IOSCharacterSummary;
  
  // From Overshoot deep analysis
  visualAnalysis: VisualAnalysisResult;
  
  // Combined/enhanced
  enhancedPreferences: string;
  combinedTraits: string[];
  personalityDepth: string;
  compatibilitySignals: string[];
}

/**
 * Analyzes a photo file using Overshoot SDK for deep character insights
 * This extends the iOS summary with visual analysis
 */
export async function analyzePhotoWithOvershoot(
  photoFile: File,
  iosSummary: IOSCharacterSummary,
  apiKey: string,
  apiUrl: string = 'https://api.overshoot.ai'
): Promise<DeepCharacterProfile> {
  // Note: This assumes Overshoot SDK will be available
  // For now, we'll create a type-safe interface that matches the SDK pattern
  
  // Dynamic import for Overshoot SDK (handles case where package isn't installed yet)
  let RealtimeVision: any;
  try {
    const overshootModule = await import('overshoot');
    RealtimeVision = overshootModule.RealtimeVision;
  } catch (error) {
    throw new Error(
      'Overshoot SDK not installed. Run: npm install overshoot@alpha\n' +
      'If alpha version unavailable, check: https://github.com/Overshoot-ai/overshoot-js-sdk'
    );
  }

  const analysisPrompt = `Analyze this profile photo deeply for dating character insights. 
  Return JSON with:
  {
    "detectedInterests": array of hobbies/interests visible (e.g., "reading", "music", "travel", "fitness"),
    "personalityHints": array of personality traits suggested by visual cues (e.g., "adventurous", "introverted", "creative", "outdoorsy"),
    "lifestyleIndicators": array describing lifestyle (e.g., "urban professional", "outdoor enthusiast", "creative artist"),
    "visualStyle": string describing fashion/aesthetic style (e.g., "casual minimalist", "bohemian", "professional classic"),
    "activitySignals": array of activities suggested by the photo (e.g., "sports", "art", "travel", "music"),
    "socialContext": string describing social setting/lifestyle (e.g., "solo traveler", "social butterfly", "family-oriented"),
    "confidence": number 0-1 indicating analysis confidence
  }

  Focus on subtle visual cues: clothing style, background elements, objects visible, setting, composition.
  Be specific and observant.`;

  return new Promise((resolve, reject) => {
    const vision = new RealtimeVision({
      apiUrl,
      apiKey,
      prompt: analysisPrompt,
      source: {
        type: 'video',
        file: photoFile,
      },
      outputSchema: {
        type: 'object',
        properties: {
          detectedInterests: {
            type: 'array',
            items: { type: 'string' },
          },
          personalityHints: {
            type: 'array',
            items: { type: 'string' },
          },
          lifestyleIndicators: {
            type: 'array',
            items: { type: 'string' },
          },
          visualStyle: { type: 'string' },
          activitySignals: {
            type: 'array',
            items: { type: 'string' },
          },
          socialContext: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['detectedInterests', 'personalityHints', 'lifestyleIndicators', 'visualStyle', 'activitySignals', 'socialContext', 'confidence'],
      },
      onResult: (result: any) => {
        if (result.ok && result.result) {
          try {
            const visualAnalysis: VisualAnalysisResult = JSON.parse(result.result);
            const deepProfile = buildDeepCharacterProfile(iosSummary, visualAnalysis);
            resolve(deepProfile);
          } catch (parseError) {
            reject(new Error(`Failed to parse visual analysis: ${parseError}`));
          }
        } else {
          reject(new Error(result.error || 'Visual analysis failed'));
        }
      },
      onError: (error: Error) => {
        reject(error);
      },
    });

    vision.start().catch(reject);
  });
}

/**
 * Combines iOS summary with Overshoot visual analysis to create deep character profile
 */
function buildDeepCharacterProfile(
  iosSummary: IOSCharacterSummary,
  visualAnalysis: VisualAnalysisResult
): DeepCharacterProfile {
  // Merge interests from both sources
  const combinedInterests = [
    ...new Set([...iosSummary.interests, ...visualAnalysis.detectedInterests]),
  ];

  // Merge traits from both sources
  const combinedTraits = [
    ...new Set([...iosSummary.traits, ...visualAnalysis.personalityHints]),
  ];

  // Build enhanced preferences combining text and visual insights
  const preferenceParts: string[] = [];
  if (iosSummary.characteristics) preferenceParts.push(iosSummary.characteristics);
  if (iosSummary.interests.length > 0) {
    preferenceParts.push(`Interests: ${iosSummary.interests.join(', ')}`);
  }
  if (visualAnalysis.detectedInterests.length > 0) {
    preferenceParts.push(`Visual interests: ${visualAnalysis.detectedInterests.join(', ')}`);
  }
  if (visualAnalysis.lifestyleIndicators.length > 0) {
    preferenceParts.push(`Lifestyle: ${visualAnalysis.lifestyleIndicators.join(', ')}`);
  }
  const enhancedPreferences = preferenceParts.join('. ');

  // Build personality depth combining both sources
  const personalityDepth = `${iosSummary.personality}. Visually suggests: ${visualAnalysis.personalityHints.join(', ')}. Lifestyle indicators: ${visualAnalysis.lifestyleIndicators.join(', ')}. Style: ${visualAnalysis.visualStyle}`;

  // Extract compatibility signals
  const compatibilitySignals = [
    ...visualAnalysis.personalityHints,
    ...visualAnalysis.lifestyleIndicators,
    visualAnalysis.visualStyle,
    visualAnalysis.socialContext,
  ];

  return {
    iosSummary,
    visualAnalysis,
    enhancedPreferences,
    combinedTraits,
    personalityDepth,
    compatibilitySignals,
  };
}

