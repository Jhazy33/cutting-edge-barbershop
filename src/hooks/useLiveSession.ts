import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Tool, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, VoiceMessage, Barber, SavedSession } from '../components/concierge/types';
import { MODEL_NAME, SYSTEM_INSTRUCTION, INITIAL_BARBERS } from '../components/concierge/constants';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../services/audioUtils';
import { handleVoiceToolCall } from '../services/voiceBackendIntegration';

// Audio Context Configuration
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

// --- TOOL DEFINITIONS ---

const getShopScheduleDecl: FunctionDeclaration = {
  name: "get_shop_schedule",
  description: "Get the current availability for all barbers in the shop.",
};

const bookAppointmentDecl: FunctionDeclaration = {
  name: "book_appointment",
  description: "Book a specific time slot with a barber.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      barberName: { type: Type.STRING, description: "Name of the barber (e.g. Fast Eddie, Doc, Vee)" },
      time: { type: Type.STRING, description: "The time slot to book (e.g. 10:00 AM)" },
      customerName: { type: Type.STRING, description: "Name of the customer" },
      phoneNumber: { type: Type.STRING, description: "Customer phone number for SMS confirmation" }
    },
    required: ["barberName", "time", "customerName", "phoneNumber"]
  }
};

const tools: Tool[] = [
  { functionDeclarations: [getShopScheduleDecl, bookAppointmentDecl] }
];

// Context Engine: Shop Atmosphere (Lively, "One of the crew" vibes)
const GREETING_CONTEXTS = [
    "ATMOSPHERE: SHOP IS JUMPING. Packed house. Music is up. High energy greeting.",
    "ATMOSPHERE: CHILL FLOW. Mid-afternoon vibe. Smooth R&B playing. Relaxed greeting.",
    "ATMOSPHERE: FRESH OPEN. Just unlocked the doors. Coffee smell. Ready to work.",
    "ATMOSPHERE: WEEKEND HYPE. Everyone getting fresh for Friday night. Excited vibe.",
    "ATMOSPHERE: LUNCH RUSH. Moving fast, staying sharp. Efficient but cool.",
    "ATMOSPHERE: THE GAME IS ON. Sports on the TV. Shop is cheering. Join the excitement.",
    "ATMOSPHERE: CLOSING TIME. Last cuts of the day. Winding down, very smooth.",
    "ATMOSPHERE: VIP. Treat the caller like they run the town. 'What's good boss?'",
    "ATMOSPHERE: CLASSIC HIP HOP. 90s beats playing. Head bobbing. Cool confidence.",
    "ATMOSPHERE: SUNNY DAY. Shop door is open. Breeze coming in. Good mood."
];

export const useLiveSession = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [volume, setVolume] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  
  // App State (The Shop Database & History)
  const [barbers, setBarbers] = useState<Barber[]>(INITIAL_BARBERS);
  const [history, setHistory] = useState<SavedSession[]>([]);

  // Audio Contexts and Nodes
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Audio Playback Queue
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Transcription Buffers
  const currentInputTranscriptionRef = useRef<string>('');
  const currentOutputTranscriptionRef = useRef<string>('');

  // Session Management
  const sessionRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Gating Mechanism (The "Silence Fix")
  // We use this to BLOCK user audio from being sent to the AI until the AI speaks first.
  const isGreetingGateActive = useRef<boolean>(false);

  // --- HISTORY MANAGEMENT ---
  useEffect(() => {
    const saved = localStorage.getItem('cutting_edge_history');
    if (saved) {
      try {
        let parsedHistory: SavedSession[] = JSON.parse(saved);
        const now = new Date();
        const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
        parsedHistory = parsedHistory.map(session => {
           if (session.status === 'active') {
             const sessionDate = new Date(session.date);
             if (now.getTime() - sessionDate.getTime() > TWO_WEEKS_MS) {
               return { ...session, status: 'trash', deletedAt: now.toISOString() };
             }
           }
           return session;
        });
        setHistory(parsedHistory);
        localStorage.setItem('cutting_edge_history', JSON.stringify(parsedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveSessionToHistory = (msgs: VoiceMessage[]) => {
    if (msgs.length === 0) return;
    const newSession: SavedSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      preview: msgs.find(m => m.role === 'user')?.text || "No transcription",
      messages: msgs,
      status: 'active'
    };
    setHistory(prev => {
      const updated = [newSession, ...prev];
      localStorage.setItem('cutting_edge_history', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteSession = (id: string, permanent: boolean = false) => {
    setHistory(prev => {
      let updated;
      if (permanent) {
        updated = prev.filter(s => s.id !== id);
      } else {
        updated = prev.map(s => s.id === id ? { ...s, status: 'trash' as const, deletedAt: new Date().toISOString() } : s);
      }
      localStorage.setItem('cutting_edge_history', JSON.stringify(updated));
      return updated;
    });
  };

  const restoreSession = (id: string) => {
    setHistory(prev => {
      const updated = prev.map(s => {
        if (s.id === id) {
          const { deletedAt, ...rest } = s;
          return { ...rest, status: 'active' as const };
        }
        return s;
      });
      localStorage.setItem('cutting_edge_history', JSON.stringify(updated));
      return updated;
    });
  };

  // --- LOGIC: BOOKING (Shared between Tool and Manual UI) ---
  const performBooking = (barberName: string, time: string, customerName: string, phoneNumber: string) => {
    let success = false;
    let message = "";
    const targetName = String(barberName).toLowerCase();
    const currentBarber = barbersRef.current.find(b => b.name.toLowerCase().includes(targetName) || targetName.includes(b.name.toLowerCase()));
    
    if (currentBarber) {
         if (!currentBarber.isWorking) {
           message = `ERROR: ${currentBarber.name} is OFF DUTY today.`;
         } else {
           const slotIndex = currentBarber.schedule.findIndex(s => s.time === time);
           if (slotIndex !== -1) {
              const slot = currentBarber.schedule[slotIndex];
              if (slot && slot.isBooked) {
                 message = `ERROR: Slot ${time} is ALREADY BOOKED.`;
              } else {
                  // UPDATE STATE
                  setBarbers(prevBarbers => {
                      return prevBarbers.map(b => {
                          if (b.id === currentBarber.id) {
                              const newSchedule = [...b.schedule];
                              const updatedSlot = newSchedule[slotIndex];
                              if (updatedSlot) {
                                newSchedule[slotIndex] = { time: updatedSlot.time, isBooked: true, bookedBy: customerName };
                              }
                              return { ...b, schedule: newSchedule };
                          }
                          return b;
                      });
                  });
                  success = true;
                  message = `SUCCESS: Booked ${time} with ${currentBarber.name}. SMS Sent to ${phoneNumber}.`;
                  setNotification({ message: `Squire SMS sent to ${phoneNumber} for ${time} with ${currentBarber.name}`, type: 'success' });
                  setTimeout(() => setNotification(null), 5000);
              }
           } else {
              message = `ERROR: Time ${time} does not exist.`;
           }
         }
    } else {
        message = "ERROR: Barber not found.";
    }
    return { success, message };
  };

  const bookAppointmentManual = (barberId: string, time: string, customerName: string, phoneNumber: string) => {
      const barber = barbersRef.current.find(b => b.id === barberId);
      if (barber) {
          performBooking(barber.name, time, customerName, phoneNumber);
      }
  };

  // --- TOOL IMPLEMENTATIONS ---
  const barbersRef = useRef(barbers);
  useEffect(() => { barbersRef.current = barbers; }, [barbers]);

  const handleToolCall = async (toolCall: any): Promise<any> => {
    const functionCalls = toolCall.functionCalls;
    const responses = [];

    for (const call of functionCalls) {
      console.log("🛠️ Tool Call:", call.name, call.args);

      try {
        // Call backend API for tool execution
        const result = await handleVoiceToolCall(call.name, call.args);
        responses.push({ id: call.id, name: call.name, response: result });
      } catch (error) {
        console.error(`❌ Error executing tool ${call.name}:`, error);
        responses.push({
          id: call.id,
          name: call.name,
          response: {
            success: false,
            message: `ERROR: Failed to execute ${call.name}. ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
      }
    }
    return { functionResponses: responses };
  };

  const connect = useCallback(async () => {
    console.log("🔌 Connect called");
    try {
      setConnectionState(ConnectionState.CONNECTING);
      setError(null);
      setMessages([]);
      
      // ACTIVATE THE GATE: Block audio from being sent initially
      isGreetingGateActive.current = true;
      console.log("🛡️ AUDIO GATE ACTIVE: Blocking user input until AI speaks.");

      // 1. Audio Setup
      console.log("🔊 Initializing Audio Contexts...");
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      if (inputContextRef.current.state === 'suspended') await inputContextRef.current.resume();
      if (outputContextRef.current.state === 'suspended') await outputContextRef.current.resume();

      nextStartTimeRef.current = 0;
      scheduledSourcesRef.current = new Set();
      
      if (outputContextRef.current) {
        outputNodeRef.current = outputContextRef.current.createGain();
        outputNodeRef.current.connect(outputContextRef.current.destination);
      }
      if (inputContextRef.current) {
        analyserRef.current = inputContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      console.log("🎤 Requesting Microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. API Connection
      if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) throw new Error("NEXT_PUBLIC_GEMINI_API_KEY not found in environment");
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

      let resolveSession: (s: any) => void = () => {};
      const sessionPromise = new Promise<any>((resolve) => {
        resolveSession = resolve;
      });

      const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/New_York",
          hour: "numeric",
          hour12: false
      });
      const hour = parseInt(formatter.format(new Date()));
      const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
      const randomContext = GREETING_CONTEXTS[Math.floor(Math.random() * GREETING_CONTEXTS.length)];

      console.log("🤝 Connecting to Gemini Live API...");
      const session = await ai.live.connect({
        model: MODEL_NAME,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: tools,
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => { 
            console.log("✅ Socket Opened"); 
          },
          onmessage: async (message: LiveServerMessage) => {
            try {
                const currentSession = await sessionPromise;

                if (message.toolCall) {
                    const response = await handleToolCall(message.toolCall);
                    currentSession.sendToolResponse(response);
                }

                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    // DEACTIVATE THE GATE: The AI has started speaking. We can now allow user interruptions.
                    if (isGreetingGateActive.current) {
                        console.log("🔓 AUDIO GATE OPENED: AI has started speaking.");
                        isGreetingGateActive.current = false;
                    }

                    if (outputContextRef.current && outputNodeRef.current) {
                        const ctx = outputContextRef.current;
                        const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), ctx, OUTPUT_SAMPLE_RATE, 1);
                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNodeRef.current);
                        
                        const now = ctx.currentTime;
                        if (nextStartTimeRef.current < now) nextStartTimeRef.current = now;
                        
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        
                        scheduledSourcesRef.current.add(source);
                        source.onended = () => scheduledSourcesRef.current.delete(source);
                    }
                }

                if (message.serverContent?.inputTranscription) {
                    currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                }
                if (message.serverContent?.outputTranscription) {
                    currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                }

                if (message.serverContent?.turnComplete) {
                    const userText = currentInputTranscriptionRef.current.trim();
                    const modelText = currentOutputTranscriptionRef.current.trim();
                    if (userText) setMessages(prev => [...prev, { id: Date.now() + '-user', role: 'user', text: userText, timestamp: new Date() }]);
                    if (modelText) setMessages(prev => [...prev, { id: Date.now() + '-model', role: 'model', text: modelText, timestamp: new Date() }]);
                    currentInputTranscriptionRef.current = '';
                    currentOutputTranscriptionRef.current = '';
                }

                if (message.serverContent?.interrupted) {
                    scheduledSourcesRef.current.forEach(src => { try { src.stop(); } catch (e) {} });
                    scheduledSourcesRef.current.clear();
                    nextStartTimeRef.current = 0; 
                    if (outputContextRef.current) nextStartTimeRef.current = outputContextRef.current.currentTime;
                    currentOutputTranscriptionRef.current = ''; 
                }
            } catch (err) {
                console.error("❌ Error processing message:", err);
            }
          },
          onclose: () => {
             console.log("🔌 Session Closed");
             setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (e) => {
            console.error("❌ Session Error", e);
            setConnectionState(ConnectionState.ERROR);
            setError("Connection error occurred.");
          }
        }
      });
      
      resolveSession(session);
      sessionRef.current = session;
      setConnectionState(ConnectionState.CONNECTED);

      // 4. THE BULLETPROOF TRIGGER
      // We send this IMMEDIATELY.
      console.log("🚀 SENDING TRIGGER...");

      // We do not delay here. The socket is open.
      await session.sendRealtimeInput([{
          text: `[SYSTEM_NOTIFY] A customer has just picked up the phone.
                 CONTEXT: ${randomContext}
                 TIME: ${timeOfDay}.
                 ACTION: Greet them IMMEDIATELY with energy. Say "Cutting Edge".
                 NOTE: Do not wait for them to speak. Start talking NOW.`
      }] as any);
      console.log("✅ TRIGGER SENT. Waiting for AI response...");

      // 5. Start Microphone Stream
      // Note: We start processing immediately so the visualizer works,
      // BUT we use `isGreetingGateActive` to block sending data to the AI.
      if (inputContextRef.current && stream) {
        const source = inputContextRef.current.createMediaStreamSource(stream);
        inputSourceRef.current = source;
        if (analyserRef.current) source.connect(analyserRef.current);

        const processor = inputContextRef.current.createScriptProcessor(512, 1, 1);
        processorRef.current = processor;
        
        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // 📊 VISUALIZER (Always runs so user sees mic is on)
          if (analyserRef.current) {
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
              analyserRef.current.getByteFrequencyData(dataArray);
              const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
              setVolume(avg / 255);
          }

          // 🛡️ GATE LOGIC: Block audio sending if waiting for greeting
          if (isGreetingGateActive.current) {
             // We drop the audio packets here.
             // This ensures the AI hears TOTAL SILENCE, forcing it to process the Text Trigger.
             return; 
          }

          // Normal Operation: Send audio
          const pcmBlob = createPcmBlob(inputData, inputContextRef.current?.sampleRate || 16000);
          session.sendRealtimeInput({ media: pcmBlob });
        };

        source.connect(processor);
        processor.connect(inputContextRef.current.destination);
      }

      // 6. Safety Timeout
      // If the AI *still* hasn't spoken after 4 seconds (maybe lag), we open the gate anyway
      // so the user isn't stuck muted forever.
      setTimeout(() => {
          if (isGreetingGateActive.current) {
              console.warn("⚠️ GATE TIMEOUT: AI didn't speak in 4s. Opening audio gate manually.");
              isGreetingGateActive.current = false;
          }
      }, 4000);

      cleanupRef.current = () => {
        if (inputSourceRef.current) inputSourceRef.current.disconnect();
        if (processorRef.current) processorRef.current.disconnect();
        if (inputContextRef.current) inputContextRef.current.close();
        if (outputContextRef.current) outputContextRef.current.close();
        scheduledSourcesRef.current.forEach(s => s.stop());
        scheduledSourcesRef.current.clear();
        session.close();
      };

    } catch (err: any) {
      console.error("❌ CONNECTION FAILED:", err);
      setConnectionState(ConnectionState.ERROR);
      setError(err.message || "Failed to connect.");
    }
  }, []);

  const disconnect = useCallback(() => {
    setMessages(currentMessages => {
        if (currentMessages.length > 0) {
            saveSessionToHistory(currentMessages);
        }
        return currentMessages;
    });

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setConnectionState(ConnectionState.DISCONNECTED);
    setVolume(0);
  }, []);

  useEffect(() => {
    return () => { if (cleanupRef.current) cleanupRef.current(); };
  }, []);

  return {
    connectionState,
    connect,
    disconnect,
    messages,
    volume,
    error,
    barbers,
    history,
    deleteSession,
    restoreSession,
    notification,
    bookAppointmentManual
  };
};