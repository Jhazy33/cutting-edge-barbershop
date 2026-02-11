import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

const VoiceInterface: React.FC = () => {
    const [active, setActive] = useState(false);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
    const sessionRef = useRef<any>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const startSession = async () => {
        try {
            setStatus('connecting');
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

            if (!apiKey || apiKey === 'your_actual_key_here' || apiKey === 'PLACEHOLDER_API_KEY') {
                setStatus('idle');
                alert("System Offline: Please configure VITE_GEMINI_API_KEY in Vercel/VPS.");
                return;
            }

            const ai = new GoogleGenAI({ apiKey });

            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            inputAudioContextRef.current = inputAudioContext;
            outputAudioContextRef.current = outputAudioContext;
            const outputNode = outputAudioContext.createGain();
            outputNode.connect(outputAudioContext.destination);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.0-flash-exp',
                callbacks: {
                    onopen: () => {
                        setStatus('listening');
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

                        scriptProcessor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };

                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            setStatus('speaking');
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNode);
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                                if (sourcesRef.current.size === 0) setStatus('listening');
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            sourcesRef.current.forEach(s => s.stop());
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                            setStatus('listening');
                        }
                    },
                    onclose: () => {
                        stopSession();
                    },
                    onerror: (err) => {
                        console.error("Live API Error", err);
                        stopSession();
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                    },
                    systemInstruction: "You are an elite AI Concierge for Cutting Edge Barbershop. Speak professionally, concisely, and help clarify services, location, and booking procedures. Keep responses short and engaging.",
                }
            });
            sessionRef.current = sessionPromise;
            setActive(true);

        } catch (e) {
            console.error(e);
            setStatus('idle');
        }
    };

    const stopSession = () => {
        sessionRef.current?.then((s: any) => s.close());
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        setActive(false);
        setStatus('idle');
    };

    // Helpers
    function createBlob(data: Float32Array) {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        const binary = encode(new Uint8Array(int16.buffer));
        return { data: binary, mimeType: 'audio/pcm;rate=16000' };
    }

    function encode(bytes: Uint8Array) {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
        return btoa(binary);
    }

    function decode(base64: string) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
        return bytes;
    }

    async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
        for (let c = 0; c < numChannels; c++) {
            const chData = buffer.getChannelData(c);
            for (let i = 0; i < frameCount; i++) {
                chData[i] = dataInt16[i * numChannels + c] / 32768.0;
            }
        }
        return buffer;
    }

    return (
        <div className="flex flex-col h-screen bg-slate-950 items-center justify-center p-6 text-center">
            {/* Background Accent Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-md w-full glass-card rounded-3xl p-10 relative shadow-2xl animate-scaleIn">
                <div className="mb-10">
                    <div className="w-24 h-24 bg-gradient-to-br from-sky-500 to-blue-800 mx-auto rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-sky-500/20 animate-float">
                        <span className="material-symbols-outlined text-5xl text-white">mic</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-white uppercase tracking-widest mb-2">Voice Concierge</h1>
                    <p className="text-slate-400 text-sm font-light uppercase tracking-widest">Google Gemini Live Pipeline</p>
                </div>

                {!active ? (
                    <button
                        onClick={startSession}
                        className="group relative w-full overflow-hidden rounded-2xl p-[1px] shadow-2xl transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-sky-500 via-blue-400 to-sky-600 opacity-50 animate-pulse"></div>
                        <div className="relative bg-slate-900 rounded-2xl py-6 px-4 flex items-center justify-center space-x-3">
                            <span className="material-symbols-outlined text-sky-400 text-2xl group-hover:animate-pulse">power_settings_new</span>
                            <span className="font-bold text-white tracking-[0.2em] uppercase text-sm">Initialize Agent</span>
                        </div>
                    </button>
                ) : (
                    <div className="space-y-8">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center space-x-3 mb-8 bg-slate-900/50 px-6 py-3 rounded-full border border-sky-500/20">
                                <span className="relative flex h-3 w-3">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'speaking' ? 'bg-sky-400' : 'bg-blue-500'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${status === 'speaking' ? 'bg-sky-400' : 'bg-blue-500'}`}></span>
                                </span>
                                <span className="text-white uppercase tracking-widest text-[11px] font-bold">
                                    {status === 'speaking' ? 'AGENT SPEAKING' : (status === 'connecting' ? 'CONNECTING...' : 'LISTENING...')}
                                </span>
                            </div>

                            {/* Visualizer Waves */}
                            <div className="h-24 flex items-center justify-center space-x-2">
                                {[...Array(9)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-2.5 bg-gradient-to-t from-sky-600 to-blue-400 rounded-full transition-all duration-300 ${status === 'speaking' ? 'h-16 animate-pulse' : (status === 'listening' ? 'h-6 opacity-40' : 'h-3 opacity-20')}`}
                                        style={{ animationDelay: `${i * 0.1}s` }}
                                    ></div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={stopSession}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-4 px-6 rounded-2xl border border-red-500/20 transition-all text-xs uppercase tracking-widest"
                        >
                            Terminate Session
                        </button>
                    </div>
                )}

                <div className="mt-12 pt-8 border-t border-white/5">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-sky-500/5 rounded-full border border-sky-500/10">
                        <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse shadow-[0_0_8px_#0ea5e9]"></span>
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.1em] font-bold">
                            Secure Cloud Link Active
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
        .glass-card {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(24px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
      `}</style>
        </div>
    );
};

export default VoiceInterface;
