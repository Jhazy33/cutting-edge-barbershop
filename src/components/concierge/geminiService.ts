import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION, CHAT_TOOLS } from './constants';

// Type definitions
interface FunctionResponsePart {
  functionResponse: {
    name: string;
    response: { result: string };
  };
}

// Singleton instance
let chatSession: Chat | null = null;
let ai: GoogleGenAI | null = null;

// --- Mock Tool Implementations ---

const mockAvailabilityDB = (barberName: string, _dayOrTime: string = 'today'): string => {
  const normalizedBarber = barberName.toLowerCase();

  if (normalizedBarber.includes('jay')) {
    return "Jay is fully booked for the next 2 days. He has one slot open Saturday at 10am.";
  }
  if (normalizedBarber.includes('mike')) {
    return "Mike has a 3pm and a 5:30pm open today.";
  }
  if (normalizedBarber.includes('sarah')) {
    return "Sarah is wide open on Sunday, but today she's slammed until 7pm.";
  }
  if (normalizedBarber.includes('devin')) {
    return "Devin is accepting walk-ins right now and has open slots all afternoon.";
  }
  return "We have openings with Devin and Mike this afternoon. Jay is booked solid.";
};

const mockCaptureLeadDB = (name: string, phone: string, reason: string): string => {
  console.log(`[TELEGRAM ALERT] Trigger: ${reason} | Name: ${name} | Phone: ${phone}`);
  return `SYSTEM: Telegram alert successfully sent to Cutting Edge Team. Lead: ${name} (${phone}). Reason: ${reason}.`;
};

// --- Service Logic ---

export const initializeChatSession = (): Chat => {
  if (chatSession) return chatSession;

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not found in environment variables");
  }

  ai = new GoogleGenAI({ apiKey });

  chatSession = ai.chats.create({
    model: 'gemini-2.0-flash-exp',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      tools: CHAT_TOOLS,
    },
  });

  return chatSession;
};

/**
 * Handles the conversation loop, including executing tools if the model requests them.
 */
export const sendMessageStreamToGemini = async function* (message: string): AsyncGenerator<string, void, unknown> {
  const chat = initializeChatSession();

  try {
    // 1. Send initial user message
    let result = await chat.sendMessageStream({ message });

    let _aggregatedText = "";
    let functionCallFound = null;

    // Process the first stream
    for await (const chunk of result) {
      // Check for text
      if (chunk.text) {
        _aggregatedText += chunk.text;
        yield chunk.text;
      }

      // Check for function calls in the chunk
      const calls = chunk.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
      if (calls && calls.length > 0) {
        functionCallFound = calls[0]?.functionCall;
      }
    }

    // 2. If a tool was called, execute it and send the response back
    while (functionCallFound) {
      const functionName = functionCallFound.name;
      if (!functionName) break;

      console.log("Model requested function:", functionName, functionCallFound.args);

      let toolResultString = "";

      // Execute Mock Logic
      if (functionName === 'checkAvailability') {
        const { barberName, dayOrTime } = functionCallFound.args as { barberName: string; dayOrTime: string };
        toolResultString = mockAvailabilityDB(barberName, dayOrTime);
      } else if (functionName === 'captureLead') {
        const { clientName, phoneNumber, reason } = functionCallFound.args as { clientName: string; phoneNumber: string; reason: string };
        toolResultString = mockCaptureLeadDB(clientName, phoneNumber, reason);
      } else {
        toolResultString = "Error: Function not found.";
      }

      // Send tool response back to model
      const toolResponseParts: FunctionResponsePart[] = [{
        functionResponse: {
          name: functionName,
          response: { result: toolResultString }
        }
      }];

      // Reset found flag to loop again if needed (chained tools)
      functionCallFound = null;

      // Stream the model's reaction to the tool result
      // Note: Type assertion required due to @google/genai library type definitions
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      result = await chat.sendMessageStream({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        message: toolResponseParts as any
      });

      for await (const chunk of result) {
        if (chunk.text) {
          yield chunk.text;
        }
        const calls = chunk.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
        if (calls && calls.length > 0) {
          functionCallFound = calls[0]?.functionCall;
        }
      }
    }

  } catch (error) {
    console.error("Error streaming message from Gemini:", error);
    yield "\n\n(System: Connection hiccup. Try again?)";
  }
}
