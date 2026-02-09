/**
 * AI Extractor Utilities
 *
 * AI-powered analysis of conversations to extract:
 * - Knowledge insights
 * - User confusion signals
 * - New information not in knowledge base
 *
 * Uses Ollama API with LLM models for analysis.
 */

import { searchKnowledgeBaseOptimized } from '../services/memoryService';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';
const MAX_RETRIES = 3;

// ============================================================================
// TYPES
// ============================================================================

export interface KnowledgeInsight {
  type: 'new_info' | 'correction' | 'pattern' | 'faq';
  content: string;
  confidence: number;
  category?: string;
}

export interface ConfusionDetection {
  needsReview: boolean;
  reason?: string;
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface NewInfoItem {
  content: string;
  confidence: number;
  category?: string;
}

// ============================================================================
// AI ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Extract knowledge insights from conversation transcript
 *
 * Uses AI to identify learnable content such as:
 * - New information not yet in knowledge base
 * - Corrections to existing knowledge
 * - Frequently asked questions
 * - Conversation patterns
 *
 * @param transcript - Conversation transcript
 * @returns Promise<KnowledgeInsight[]> - Extracted insights
 */
export async function extractKnowledgeInsights(
  transcript: string
): Promise<KnowledgeInsight[]> {
  const startTime = Date.now();
  let lastError: Error | null = null;

  // Validate input
  if (!transcript || typeof transcript !== 'string' || transcript.length < 50) {
    throw new Error('Invalid transcript: must be at least 50 characters');
  }

  // Retry loop
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const prompt = buildExtractionPrompt(transcript);

      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.OLLAMA_API_KEY && {
            'X-Ollama-Key': process.env.OLLAMA_API_KEY,
          }),
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
          options: {
            temperature: 0.3, // Lower temp for more focused extraction
            num_predict: 500, // Limit response length
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const insights = parseInsightsResponse(data.response);

      console.log(
        `✅ Knowledge extraction completed (${insights.length} insights, ${Date.now() - startTime}ms)`
      );

      return insights;
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Extraction attempt ${attempt + 1}/${MAX_RETRIES} failed:`, error);

      if (attempt < MAX_RETRIES - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error('❌ All extraction attempts failed, returning empty array');
  return [];
}

/**
 * Detect user confusion or dissatisfaction
 *
 * Analyzes conversation for:
 * - Repetitive questions
 * - Frustration indicators
 * - Negative sentiment
 * - Confusion markers
 *
 * @param transcript - Conversation transcript
 * @returns Promise<ConfusionDetection> - Detection results
 */
export async function detectConfusion(transcript: string): Promise<ConfusionDetection> {
  const startTime = Date.now();

  try {
    // Fast rule-based detection (synchronous)
    const ruleBasedResult = runRuleBasedDetection(transcript);

    if (ruleBasedResult.needsReview) {
      console.log(`🚩 Rule-based confusion detected (${Date.now() - startTime}ms)`);
      return ruleBasedResult;
    }

    // If no rules triggered, use AI for deeper analysis
    // (but keep it fast with timeout)
    const aiResult = await Promise.race([
      runAIDetection(transcript),
      new Promise<ConfusionDetection>((resolve) =>
        setTimeout(
          () =>
            resolve({
              needsReview: false,
              confidence: 0,
              sentiment: 'neutral',
            }),
          5000 // 5 second timeout
        )
      ),
    ]);

    console.log(`✅ Confusion detection completed (${Date.now() - startTime}ms)`);
    return aiResult;
  } catch (error) {
    console.error('❌ Confusion detection failed:', error);
    return {
      needsReview: false,
      confidence: 0,
      sentiment: 'neutral',
    };
  }
}

/**
 * Identify new information not in knowledge base
 *
 * @param transcript - Conversation transcript
 * @param shopId - Shop ID for knowledge base search
 * @returns Promise<NewInfoItem[]> - New information items
 */
export async function identifyNewInfo(
  transcript: string,
  shopId: number
): Promise<NewInfoItem[]> {
  const startTime = Date.now();

  try {
    // Extract potential facts/concepts from transcript
    const potentialFacts = await extractPotentialFacts(transcript);

    if (potentialFacts.length === 0) {
      return [];
    }

    // Check each fact against knowledge base
    const newInfoItems: NewInfoItem[] = [];

    for (const fact of potentialFacts) {
      // Search knowledge base for similar content
      const searchResults = await searchKnowledgeBaseOptimized(fact.content, shopId, 3, undefined, 0.85);

      // If no highly similar results found, it's likely new information
      if (searchResults.length === 0 || searchResults[0].similarity < 0.85) {
        newInfoItems.push({
          content: fact.content,
          confidence: fact.confidence,
          category: fact.category,
        });
      }
    }

    console.log(`✅ Identified ${newInfoItems.length} new info items (${Date.now() - startTime}ms)`);

    return newInfoItems;
  } catch (error) {
    console.error('❌ New info identification failed:', error);
    return [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build prompt for knowledge extraction
 */
function buildExtractionPrompt(transcript: string): string {
  return `Analyze this conversation transcript and extract potential knowledge updates.

Transcript:
${transcript.substring(0, 2000)}

Extract any of the following:
1. NEW_INFO: New information, facts, or details
2. CORRECTION: Corrections to existing information
3. PATTERN: Repeated patterns or frequently discussed topics
4. FAQ: Questions that seem to be asked frequently

For each item, provide:
- Type (NEW_INFO, CORRECTION, PATTERN, FAQ)
- Content (the actual information)
- Category (pricing, hours, services, policies, general, etc.)
- Confidence (0.0 to 1.0)

Format as JSON array:
[
  {
    "type": "NEW_INFO",
    "content": "the information here",
    "category": "pricing",
    "confidence": 0.9
  }
]

Return ONLY the JSON array, no other text.`;
}

/**
 * Parse AI response for insights
 */
function parseInsightsResponse(response: string): KnowledgeInsight[] {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('⚠️  No JSON found in extraction response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      console.warn('⚠️  Extraction response is not an array');
      return [];
    }

    return parsed
      .filter((item) => {
        return (
          item.type &&
          item.content &&
          ['new_info', 'correction', 'pattern', 'faq'].includes(item.type)
        );
      })
      .map((item) => ({
        type: item.type,
        content: item.content,
        confidence: item.confidence || 0.5,
        category: item.category || 'general',
      }));
  } catch (error) {
    console.error('❌ Failed to parse insights response:', error);
    return [];
  }
}

/**
 * Rule-based confusion detection (fast, synchronous)
 */
function runRuleBasedDetection(transcript: string): ConfusionDetection {
  const lowerTranscript = transcript.toLowerCase();

  // Confusion indicators
  const confusionPatterns = [
    /\bi don't understand\b/,
    /\bwhat do you mean\b/,
    /\bcan you explain\b/,
    /\bi'm confused\b/,
    /\bthat doesn't make sense\b/,
    /\bi don't get it\b/,
  ];

  // Frustration indicators
  const frustrationPatterns = [
    /\bthis is frustrating\b/,
    /\bthis is annoying\b/,
    /\bi'm getting frustrated\b/,
    /\bwhy can't you\b/,
    /\bnever mind\b/,
    /\bforget it\b/,
  ];

  // Repetitive questions (simple heuristic)
  const questionPattern = /\?/g;
  const questionMatches = lowerTranscript.match(questionPattern);
  const questionCount = questionMatches ? questionMatches.length : 0;

  // Check patterns
  const hasConfusion = confusionPatterns.some((pattern) => pattern.test(lowerTranscript));
  const hasFrustration = frustrationPatterns.some((pattern) => pattern.test(lowerTranscript));
  const hasManyQuestions = questionCount >= 5;

  if (hasFrustration) {
    return {
      needsReview: true,
      reason: 'User frustration detected',
      confidence: 0.9,
      sentiment: 'negative',
    };
  }

  if (hasConfusion && hasManyQuestions) {
    return {
      needsReview: true,
      reason: 'User confusion with repetitive questions',
      confidence: 0.8,
      sentiment: 'negative',
    };
  }

  if (hasConfusion) {
    return {
      needsReview: true,
      reason: 'User confusion detected',
      confidence: 0.7,
      sentiment: 'neutral',
    };
  }

  if (hasManyQuestions) {
    return {
      needsReview: true,
      reason: 'Repetitive questions detected',
      confidence: 0.6,
      sentiment: 'neutral',
    };
  }

  return {
    needsReview: false,
    confidence: 0.9,
    sentiment: 'neutral',
  };
}

/**
 * AI-based confusion detection (slower, more accurate)
 */
async function runAIDetection(transcript: string): Promise<ConfusionDetection> {
  try {
    const prompt = `Analyze this conversation for user confusion or frustration.

Transcript:
${transcript.substring(0, 1000)}

Determine:
1. Does the user seem confused? (true/false)
2. Does the user seem frustrated? (true/false)
3. What is the overall sentiment? (positive/neutral/negative)
4. If confused/frustrated, what is the reason? (brief explanation)

Format as JSON:
{
  "confused": true/false,
  "frustrated": true/false,
  "sentiment": "positive/neutral/negative",
  "reason": "explanation if confused or frustrated, otherwise null"
}

Return ONLY the JSON, no other text.`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.OLLAMA_API_KEY && {
          'X-Ollama-Key': process.env.OLLAMA_API_KEY,
        }),
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 200,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.response);

    return {
      needsReview: result.confused || result.frustrated,
      reason: result.reason || (result.frustrated ? 'User frustration detected' : 'User confusion detected'),
      confidence: result.confused || result.frustrated ? 0.8 : 0.7,
      sentiment: result.sentiment || 'neutral',
    };
  } catch (error) {
    console.error('❌ AI-based detection failed:', error);
    return {
      needsReview: false,
      confidence: 0,
      sentiment: 'neutral',
    };
  }
}

/**
 * Extract potential facts from transcript
 */
async function extractPotentialFacts(transcript: string): Promise<Array<{
  content: string;
  confidence: number;
  category?: string;
}>> {
  try {
    const prompt = `Extract factual statements from this conversation.

Transcript:
${transcript.substring(0, 1500)}

Extract statements that appear to be factual information about:
- Prices, costs, fees
- Business hours, schedules
- Services offered
- Policies, rules
- Contact information
- Location details

For each fact:
- Content (the factual statement)
- Category (pricing, hours, services, policies, contact, location, other)
- Confidence (0.0 to 1.0)

Format as JSON array:
[
  {
    "content": "haircuts cost $30",
    "category": "pricing",
    "confidence": 0.9
  }
]

Return ONLY the JSON array, no other text.`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.OLLAMA_API_KEY && {
          'X-Ollama-Key': process.env.OLLAMA_API_KEY,
        }),
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 500,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const jsonMatch = data.response.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed.filter((item: any) => item.content && item.content.length > 10);
  } catch (error) {
    console.error('❌ Fact extraction failed:', error);
    return [];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  extractKnowledgeInsights,
  detectConfusion,
  identifyNewInfo,
};
