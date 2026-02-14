// Combined types for Voice and Chat concierge

export interface VoiceMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioVisualizerData {
  volume: number;
}

export interface TimeSlot {
  time: string;
  isBooked: boolean;
  bookedBy?: string;
}

export interface Barber {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  isWorking: boolean;
  schedule: TimeSlot[];
}

export interface SavedSession {
  id: string;
  date: string;
  preview: string;
  messages: VoiceMessage[];
  status: 'active' | 'trash';
  deletedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export type ConciergeMode = 'voice' | 'chat' | 'both';
