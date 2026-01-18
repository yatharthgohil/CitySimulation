# Photo Analysis System with Overshoot SDK

This system integrates [Overshoot SDK](https://github.com/Overshoot-ai/overshoot-js-sdk) to perform deep visual analysis on user photos, building comprehensive character profiles by combining iOS-generated summaries with AI vision insights.

## Architecture

### Flow
1. **iOS App** → Takes photos, generates initial character summary (traits, personality, interests)
2. **API Endpoint** → Receives photo + iOS summary via `/api/users/analyze-photo`
3. **Overshoot SDK** → Performs deep visual analysis (detects interests, personality hints, lifestyle indicators)
4. **Profile Builder** → Merges iOS summary + Overshoot analysis into deep character profile
5. **User Database** → Stores enhanced profile with visual analysis data

## Setup

### 1. Install Overshoot SDK

```bash
npm install overshoot@alpha
```

If the alpha version is not available, check the [Overshoot SDK repository](https://github.com/Overshoot-ai/overshoot-js-sdk) for installation instructions.

### 2. Configure Environment Variables

Add to `.env.local`:

```env
OVERSHOOT_API_KEY=your-overshoot-api-key-here
OVERSHOOT_API_URL=https://api.overshoot.ai
```

### 3. API Endpoint

**POST** `/api/users/analyze-photo`

**Request Format** (multipart/form-data):
- `photo`: File (image/jpeg, image/png, etc.)
- `userId`: string (optional - if updating existing user)
- `iosSummary`: JSON string with:
  ```json
  {
    "traits": ["adventurous", "creative"],
    "personality": "Outgoing and friendly",
    "interests": ["travel", "photography"],
    "characteristics": "Enjoys exploring new places"
  }
  ```

**Response**:
```json
{
  "success": true,
  "deepProfile": {
    "iosSummary": { ... },
    "visualAnalysis": {
      "detectedInterests": ["reading", "music"],
      "personalityHints": ["introverted", "creative"],
      "lifestyleIndicators": ["urban professional"],
      "visualStyle": "casual minimalist",
      "activitySignals": ["art", "music"],
      "socialContext": "solo traveler",
      "confidence": 0.85
    },
    "enhancedPreferences": "...",
    "combinedTraits": [...],
    "personalityDepth": "...",
    "compatibilitySignals": [...]
  }
}
```

## Usage

### From iOS App

```swift
// Example Swift code
let photo = // UIImage or file
let iosSummary: [String: Any] = [
    "traits": ["adventurous", "creative"],
    "personality": "Outgoing and friendly",
    "interests": ["travel", "photography"],
    "characteristics": "Enjoys exploring new places"
]

let url = URL(string: "https://your-domain.com/api/users/analyze-photo")!
var request = URLRequest(url: url)
request.httpMethod = "POST"

let boundary = UUID().uuidString
request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

var body = Data()
body.append("--\(boundary)\r\n".data(using: .utf8)!)
body.append("Content-Disposition: form-data; name=\"photo\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
body.append(photoData)

body.append("\r\n--\(boundary)\r\n".data(using: .utf8)!)
body.append("Content-Disposition: form-data; name=\"iosSummary\"\r\n\r\n".data(using: .utf8)!)
body.append(try! JSONSerialization.data(withJSONObject: iosSummary))

body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

request.httpBody = body

// Send request...
```

### From JavaScript/TypeScript

```typescript
const formData = new FormData();
formData.append('photo', photoFile);
formData.append('userId', userId); // optional
formData.append('iosSummary', JSON.stringify({
  traits: ['adventurous', 'creative'],
  personality: 'Outgoing and friendly',
  interests: ['travel', 'photography'],
  characteristics: 'Enjoys exploring new places'
}));

const response = await fetch('/api/users/analyze-photo', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

## Data Structure

### UserProfile Enhancement

The `UserProfile` interface now includes:

```typescript
photoAnalysis?: {
  iosSummary?: {
    traits: string[];
    personality: string;
    interests: string[];
    characteristics: string;
  };
  visualAnalysis?: {
    detectedInterests: string[];
    personalityHints: string[];
    lifestyleIndicators: string[];
    visualStyle: string;
    activitySignals: string[];
    socialContext: string;
    confidence: number;
  };
  enhancedPreferences?: string;
  combinedTraits?: string[];
  personalityDepth?: string;
  compatibilitySignals?: string[];
}
```

## Deep Analysis Features

### What Overshoot Analyzes:
- **Detected Interests**: Hobbies visible in photo (books, instruments, sports gear)
- **Personality Hints**: Traits suggested by visual cues (clothing, setting, pose)
- **Lifestyle Indicators**: Overall lifestyle (urban professional, outdoor enthusiast)
- **Visual Style**: Fashion/aesthetic (casual minimalist, bohemian, professional)
- **Activity Signals**: Activities suggested (sports, art, travel)
- **Social Context**: Social setting/lifestyle (solo traveler, social butterfly)

### Profile Enhancement:
- **Enhanced Preferences**: Combines iOS characteristics + visual interests + lifestyle
- **Combined Traits**: Merges iOS traits + visual personality hints
- **Personality Depth**: Multi-dimensional personality combining both sources
- **Compatibility Signals**: Visual indicators for matching compatibility

## Integration with Dating System

The enhanced profile data is automatically used by:
- **System Prompts** (`systemPrompts.ts`): More detailed character descriptions
- **Compatibility Analysis** (`compatibilityInsight.ts`): Visual + personality matching
- **Date Orchestrator**: Richer context for conversations

## Error Handling

The system handles:
- Missing Overshoot SDK (graceful error message)
- Invalid photo format
- API key configuration issues
- JSON parsing errors
- User not found (when updating)

## Future Enhancements

- Support for multiple photos per user
- Real-time analysis during profile creation
- Visual compatibility scoring between users
- Photo quality validation
- Caching analysis results

