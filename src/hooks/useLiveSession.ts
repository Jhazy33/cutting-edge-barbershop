import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Tool, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, VoiceMessage, Barber, SavedSession } from '../components/concierge/types';
import { MODEL_NAME, SYSTEM_INSTRUCTION, INITIAL_BARBERS } from '../components/concierge/constants';
import { createPcmBlob, decodeAudioData, base64ToUint8Array, arrayBufferToBase64 } from '../services/audioUtils';
import { handleVoiceToolCall } from '../services/voiceBackendIntegration';

// Audio Context Configuration
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

// --- TOOL DEFINITIONS ---

const getShopScheduleDecl: FunctionDeclaration = {
  name: "get_shop_schedule",
  description: "Get the current availability for all barbers in the shop. Can optionally query future dates.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: "The date to query availability for. Format: YYYY-MM-DD. Defaults to today." }
    }
  }
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

const updateBarberStatusOverrideDecl: FunctionDeclaration = {
  name: "update_barber_status_override",
  description: "Secure Command for Shop Managers only: Update a barber's 'working' status for the current day (e.g. mark them as sick, off duty, or back early). Provide the authorization key 'telegram_admin'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      barberName: { type: Type.STRING, description: "Name of the barber (e.g. Fast Eddie, T-Bone)" },
      isWorking: { type: Type.BOOLEAN, description: "True if they are clocking IN. False if they are clocking OUT (off duty)." },
      contextReason: { type: Type.STRING, description: "Short justification string (e.g. 'He is sick' or 'Family emergency')" },
      authKey: { type: Type.STRING, description: "Must be 'telegram_admin' to succeed." }
    },
    required: ["barberName", "isWorking", "authKey"]
  }
};

const tools: Tool[] = [
  { functionDeclarations: [getShopScheduleDecl, bookAppointmentDecl, updateBarberStatusOverrideDecl] }
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
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' } | null>(null);

  // App State (The Shop Database & History)
  const [barbers, setBarbers] = useState<Barber[]>(INITIAL_BARBERS);
  const [history, setHistory] = useState<SavedSession[]>([]);

  // Audio Contexts and Nodes
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // UX Masking: Synthesized Ringing Sound
  const ringContextRef = useRef<AudioContext | null>(null);
  const ringOsc1Ref = useRef<OscillatorNode | null>(null);
  const ringOsc2Ref = useRef<OscillatorNode | null>(null);
  const ringGainRef = useRef<GainNode | null>(null);
  const ringIntervalRef = useRef<any>(null);

  const startRinging = useCallback(() => {
    try {
      if (!ringContextRef.current) {
        ringContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = ringContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      ringGainRef.current = ctx.createGain();
      ringGainRef.current.gain.value = 0; // start silent
      ringGainRef.current.connect(ctx.destination);

      ringOsc1Ref.current = ctx.createOscillator();
      ringOsc2Ref.current = ctx.createOscillator();
      ringOsc1Ref.current.type = 'sine';
      ringOsc2Ref.current.type = 'sine';
      ringOsc1Ref.current.frequency.value = 440; // North American ringback tone (440Hz + 480Hz)
      ringOsc2Ref.current.frequency.value = 480;

      ringOsc1Ref.current.connect(ringGainRef.current);
      ringOsc2Ref.current.connect(ringGainRef.current);
      ringOsc1Ref.current.start();
      ringOsc2Ref.current.start();

      // Pulsing Pattern: 2 seconds ON, 4 seconds OFF
      const pulseRing = () => {
        const now = ctx.currentTime;
        ringGainRef.current?.gain.setValueAtTime(0, now);
        ringGainRef.current?.gain.linearRampToValueAtTime(0.5, now + 0.05); // Fade in
        ringGainRef.current?.gain.setValueAtTime(0.5, now + 2.0); // Hold for 2s
        ringGainRef.current?.gain.linearRampToValueAtTime(0, now + 2.05); // Fade out
      };

      pulseRing(); // immediately play first pulse
      ringIntervalRef.current = setInterval(pulseRing, 6000); // Repeat every 6s

    } catch (e) {
      console.warn("Could not start synthesized ringtone:", e);
    }
  }, []);

  const stopRinging = useCallback(() => {
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    if (ringGainRef.current && ringContextRef.current) {
      // Smooth fade out
      ringGainRef.current.gain.linearRampToValueAtTime(0, ringContextRef.current.currentTime + 0.1);
    }
    setTimeout(() => {
      try {
        ringOsc1Ref.current?.stop();
        ringOsc2Ref.current?.stop();
        ringOsc1Ref.current?.disconnect();
        ringOsc2Ref.current?.disconnect();
        ringGainRef.current?.disconnect();
      } catch (e) { } // Ignore if already stopped
    }, 150);
  }, []);

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
        let result;

        // INTERCEPT BOOKING to update React State UI locally
        if (call.name === 'book_appointment') {
          const { barberName, time, customerName, phoneNumber } = call.args;
          const localBooking = performBooking(barberName, time, customerName, phoneNumber);
          const backendResult = await handleVoiceToolCall(call.name, call.args);

          // If the backend call succeeded but the local one failed (e.g. booked already locally), 
          // we merge the messages for safety, but otherwise trust backend structure
          result = backendResult;
        } else if (call.name === 'update_barber_status_override') {
          const { barberName, isWorking, authKey, contextReason } = call.args;

          if (authKey !== 'telegram_admin') {
            result = { success: false, message: "ERROR: Unauthorized. Invalid Telegram PIN." };
          } else {
            const targetName = String(barberName).toLowerCase();
            setBarbers(prevBarbers => {
              return prevBarbers.map(b => {
                if (b.name.toLowerCase().includes(targetName) || targetName.includes(b.name.toLowerCase())) {
                  // If they are clocking out, wipe their available slots natively on the UI 
                  const newSchedule = isWorking ? b.schedule : b.schedule.map(s => ({ ...s, isBooked: true, bookedBy: 'OFF DUTY' }));
                  return { ...b, isWorking, schedule: newSchedule };
                }
                return b;
              });
            });

            result = {
              success: true,
              message: `SUCCESS: Barber ${barberName} is now ${isWorking ? 'ON DUTY' : 'OFF DUTY'}. DB Updated.`
            };

            setNotification({
              message: `Telegram Sync: ${barberName} marked ${isWorking ? 'Available' : 'Unavailable'}. ${contextReason || ''}`,
              type: isWorking ? 'success' : 'info'
            });
            setTimeout(() => setNotification(null), 8000);
          }
        } else {
          // Call backend API for all other tool execution
          result = await handleVoiceToolCall(call.name, call.args);
        }

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

      // ACTIVATE THE GATE & START RINGING UX
      isGreetingGateActive.current = true;
      startRinging();
      console.log("🛡️ AUDIO GATE ACTIVE: UX Ringing started, awaiting AI greeting.");

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

      console.log("🎤 Requesting Microphone with Voice Constraints...");
      let stream: MediaStream;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone API is not supported in this browser context. Please ensure you are using HTTPS or localhost.");
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
      } catch (mediaErr: any) {
        console.error("Microphone permission error:", mediaErr?.message || mediaErr);
        if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
          throw new Error("Microphone access denied. Please click the icon in your address bar to allow microphone access, then try again.");
        } else if (mediaErr.name === 'NotFoundError') {
          throw new Error("No microphone found. Please ensure a microphone is connected and trying again.");
        }
        throw new Error("Could not access the microphone. " + (mediaErr.message || "Please check permissions."));
      }

      // 2. API Connection
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key not found. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file.");
      }
      const ai = new GoogleGenAI({ apiKey });

      let resolveSession: (s: any) => void = () => { };
      const sessionPromise = new Promise<any>((resolve) => {
        resolveSession = resolve;
      });

      const exactTimeFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      const exactTimeEST = exactTimeFormatter.format(new Date());

      const hour = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }).format(new Date()));
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
              console.log("📥 SERVER MESSAGE:", message);
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
                  stopRinging();
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
                scheduledSourcesRef.current.forEach(src => { try { src.stop(); } catch (e) { } });
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
            if (cleanupRef.current) {
              cleanupRef.current();
            }
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

      let isSessionActive = true;
      const exactDateFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York"
      });
      const dayOfWeekFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        weekday: "long"
      });
      const now = new Date();
      const todayDateEST = exactDateFormatter.format(now);
      const dayOfWeekEST = dayOfWeekFormatter.format(now);

      // We do not delay here. The socket is open.
      session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{
              text: `[SYSTEM_NOTIFY] A customer has just picked up the phone.
                     CONTEXT: ${randomContext}
                     DATE/TIME: Today is ${dayOfWeekEST}, ${todayDateEST}. The current time is exactly ${exactTimeEST} EST (${timeOfDay}). Never offer appointments that are in the past. If the day is Sunday or Monday, inform the customer the shop is closed.
                     ACTION: Greet them IMMEDIATELY with energy. Say "Cutting Edge".
                     NOTE: Do not wait for them to speak. Start talking NOW.`
            }]
          }
        ],
        turnComplete: true
      });
      console.log("✅ TRIGGER SENT. Waiting for AI response...");

      // 5. Start Microphone Stream with AudioWorklet
      if (inputContextRef.current && stream) {
        try {
          // Load the external worklet script from the public folder
          await inputContextRef.current.audioWorklet.addModule('/audioWorklet.js');

          const source = inputContextRef.current.createMediaStreamSource(stream);
          inputSourceRef.current = source;
          if (analyserRef.current) source.connect(analyserRef.current);

          const workletNode = new AudioWorkletNode(inputContextRef.current, 'audio-processor');
          workletNodeRef.current = workletNode;

          let pcmChunks: Uint8Array[] = [];
          let pcmChunksLength = 0;

          workletNode.port.onmessage = (event) => {
            // 🛡️ GATE LOGIC: Block sending the stream but don't crash the data pipeline
            if (isGreetingGateActive.current || !isSessionActive) return;

            const pcm16Buffer = event.data;
            const chunk = new Uint8Array(pcm16Buffer);
            pcmChunks.push(chunk);
            pcmChunksLength += chunk.length;

            // Batch 250ms chunks (16000 Hz * 2 bytes = 32000 bytes/sec -> 8000 bytes = 250ms)
            if (pcmChunksLength >= 8000) {
              const combined = new Uint8Array(pcmChunksLength);
              let offset = 0;
              for (const c of pcmChunks) {
                combined.set(c, offset);
                offset += c.length;
              }

              const base64Data = arrayBufferToBase64(combined.buffer);

              try {
                if (isSessionActive) {
                  session.sendRealtimeInput({
                    media: {
                      mimeType: 'audio/pcm;rate=16000',
                      data: base64Data
                    }
                  });
                }
              } catch (e) {
                // Suppress silent drop errors if socket closed exactly between checks
                isSessionActive = false;
              }

              pcmChunks = [];
              pcmChunksLength = 0;
            }
          };

          source.connect(workletNode);
          workletNode.connect(inputContextRef.current.destination);

          // 📊 VISUALIZER (Running on requestAnimationFrame since we don't have onaudioprocess)
          const updateVisualizer = () => {
            if (analyserRef.current && sessionRef.current && isSessionActive) {
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] ?? 0;
              }
              const avg = sum / dataArray.length;
              setVolume(avg / 255);
              animationFrameRef.current = requestAnimationFrame(updateVisualizer);
            }
          };
          updateVisualizer();
        } catch (workletError) {
          console.error("AudioWorklet initialization crashed:", workletError);
          // Don't kill the connection if only the visualizer or worklet fails, just alert developers
        }
      }

      // 6. Safety Timeout
      // If the AI *still* hasn't spoken after 2.5 seconds (maybe lag), we open the gate anyway
      // so the user isn't stuck muted forever.
      setTimeout(() => {
        if (isGreetingGateActive.current) {
          console.warn("⚠️ GATE TIMEOUT: AI didn't speak in 2.5s. Opening audio gate manually.");
          isGreetingGateActive.current = false;
          stopRinging();
        }
      }, 2500);

      cleanupRef.current = () => {
        isSessionActive = false;
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (inputSourceRef.current) inputSourceRef.current.disconnect();
        if (workletNodeRef.current) workletNodeRef.current.disconnect();
        if (inputContextRef.current) inputContextRef.current.close();
        if (outputContextRef.current) outputContextRef.current.close();
        scheduledSourcesRef.current.forEach(s => s.stop());
        scheduledSourcesRef.current.clear();
        session.close();
      };

    } catch (err: any) {
      console.error("❌ CONNECTION FAILED:", err?.message || err);
      stopRinging();
      isGreetingGateActive.current = false;
      setConnectionState(ConnectionState.ERROR);
      setError(err.message || "Failed to connect to the shop.");
    }
  }, []);

  const disconnect = useCallback(() => {
    stopRinging();
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