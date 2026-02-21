/**
 * Chat Service
 *
 * Unified RAG + AI generation endpoint for the chatbot.
 * Combines knowledge retrieval with Ollama AI response generation.
 */

import { searchKnowledgeBaseOptimized } from './memoryService';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma:2b';
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  shopId: number;
  conversationHistory?: ChatMessage[];
  limit?: number;
  threshold?: number;
}

export interface ChatResponse {
  response: string;
  sources?: Array<{
    content: string;
    category: string;
    similarity: number;
    source: string;
  }>;
  conversationId?: string;
}

export interface MessageSource {
  content: string;
  category: string;
  similarity: number;
  source: string;
}

// ============================================================================
// CHAT HANDLER
// ============================================================================

/**
 * Main chat handler - RAG + AI generation
 *
 * Process:
 * 1. Search knowledge base for relevant context
 * 2. Build system prompt with context
 * 3. Generate response using Ollama
 * 4. Return response with sources
 *
 * @param request - Chat request with message and history
 * @returns Promise<ChatResponse> - AI response with sources
 */
export async function handleChat(request: ChatRequest): Promise<ChatResponse> {
  const startTime = Date.now();

  // Validate input
  if (!request.message || typeof request.message !== 'string' || request.message.trim().length < 1) {
    throw new Error('Message is required and must be non-empty');
  }

  if (!request.shopId || typeof request.shopId !== 'number' || request.shopId <= 0) {
    throw new Error('Valid shopId is required');
  }

  const limit = request.limit || 3;
  const threshold = request.threshold || 0.7;

  console.log(`📨 Chat request: "${request.message.substring(0, 50)}..." (shopId: ${request.shopId})`);

  try {
    // Step 1: Retrieve relevant context from knowledge base
    const contextSources = await searchKnowledgeBaseOptimized(
      request.message.trim(),
      request.shopId,
      limit,
      undefined,
      threshold
    );

    console.log(`📚 Retrieved ${contextSources.length} context items (${Date.now() - startTime}ms)`);

    // Step 2: Build system prompt with context
    const systemPrompt = buildSystemPrompt(contextSources);

    // Step 3: Build messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(request.conversationHistory || []),
      { role: 'user', content: request.message }
    ];

    // Step 4: Generate AI response
    const aiResponse = await generateOllamaResponse(messages);

    console.log(`✅ Chat completed in ${Date.now() - startTime}ms`);

    // Step 5: Return response with sources
    return {
      response: aiResponse,
      sources: contextSources.length > 0 ? contextSources : undefined,
    };
  } catch (error) {
    console.error('❌ Chat failed:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build system prompt with RAG context
 */
function buildSystemPrompt(contextSources: MessageSource[]): string {
  let prompt = `You are a helpful assistant for Cutting Edge Barbershop.

Be concise, friendly, and professional. Answer questions about:
- Services and pricing
- Hours and location
- Staff and barbers
- Booking and appointments
- Policies and procedures

If you don't know something specific, say so and suggest they contact the shop directly.`;

  // Add RAG context if available
  if (contextSources.length > 0) {
    const contextText = contextSources
      .map(c => `- [${c.category}] ${c.content}`)
      .join('\n');
    prompt += `\n\nRELEVANT INFORMATION:\n${contextText}\n\nUse this information to answer accurately. If the information doesn't answer the question, say so politely.`;
  } else {
    prompt += `\n\nNo specific information found. Use your general knowledge but be clear about limitations.`;
  }

  return prompt;
}

/**
 * Generate response using Ollama API
 */
async function generateOllamaResponse(messages: ChatMessage[]): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.OLLAMA_API_KEY && {
            'X-Ollama-Key': process.env.OLLAMA_API_KEY,
          }),
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: messages,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 500,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.message || !data.message.content) {
        throw new Error('Invalid Ollama response format');
      }

      return data.message.content.trim();
    } catch (error: any) {
      lastError = error;

      if (error.name === 'AbortError') {
        console.error(`⏱️ Ollama timeout on attempt ${attempt + 1}/${MAX_RETRIES}`);
      } else {
        console.error(`❌ Ollama attempt ${attempt + 1}/${MAX_RETRIES} failed:`, error.message);
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = 1000 * Math.pow(2, attempt); // Exponential backoff
        // No fix actually needed here as the timeout is cleared above or handled by AbortController
        // But for completeness, we ensure the loop continues correctly.
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to generate AI response after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  handleChat,
};
