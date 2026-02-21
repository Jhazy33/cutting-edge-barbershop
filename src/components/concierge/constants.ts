import { Barber } from './types';
import { Tool } from '@google/genai';

export const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';

// Initial greeting message for chat interface
export const INITIAL_MESSAGE = "Yo, what's good! Welcome to Cutting Edge. I'm your digital concierge, here to help you book a fresh cut or answer any questions. What can I do for you today?";

// Chat tools for text-based chat interface
export const CHAT_TOOLS: Tool[] = [];

/**
 * Checks if a given time string (e.g. "1:00 PM") has already passed today in EST.
 * If checkDateStr is provided and is a future date, returns false.
 * param checkDateStr Format: "YYYY-MM-DD"
 */
export function isPastTime(timeStr: string, checkDateStr?: string): boolean {
  const parts = timeStr.match(/(\d+):(\d+)\s+(AM|PM)/i);
  if (!parts || !parts[1] || !parts[2] || !parts[3]) return false;

  // Check date strictly in EST
  const estDateFormatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD cleanly
    timeZone: 'America/New_York'
  });
  const todayEST = estDateFormatter.format(new Date());

  if (checkDateStr) {
    if (checkDateStr > todayEST) {
      // Future date -> time cannot have passed
      return false;
    }
  }

  // Convert the slot to a 24-hour integer for math
  let slotHour24 = parseInt(parts[1], 10);
  const slotMinute = parseInt(parts[2], 10);
  const isPM = parts[3].toUpperCase() === 'PM';

  if (isPM && slotHour24 < 12) slotHour24 += 12;
  if (!isPM && slotHour24 === 12) slotHour24 = 0;

  // Getting current EST time safely without string parsing
  const now = new Date();
  const options = { timeZone: 'America/New_York', hour12: false, hour: 'numeric', minute: 'numeric' } as const;

  // Format returns something like "15:05" or "24:05" or "00:05"
  const estTimeString = now.toLocaleTimeString('en-US', options);
  const estTimeParts = estTimeString.split(':');

  let currentHourEST = parseInt(estTimeParts[0] || '0', 10);
  const currentMinuteEST = parseInt(estTimeParts[1] || '0', 10);

  // handle 24:00 edge case if it occurs
  if (currentHourEST === 24) currentHourEST = 0;

  if (slotHour24 < currentHourEST) return true;
  if (slotHour24 === currentHourEST && slotMinute <= currentMinuteEST) return true;

  return false;
}

export const INITIAL_BARBERS: Barber[] = [
  {
    id: 'eddie',
    name: "Fast Eddie",
    specialty: "Precision Fades",
    avatar: "https://i.pravatar.cc/150?u=eddie",
    isWorking: true,
    schedule: [
      { time: "9:00 AM", isBooked: false },
      { time: "10:00 AM", isBooked: false },
      { time: "11:00 AM", isBooked: true, bookedBy: "Mikey" },
      { time: "1:00 PM", isBooked: false },
      { time: "2:00 PM", isBooked: false },
      { time: "3:00 PM", isBooked: true, bookedBy: "J-Rock" },
      { time: "4:00 PM", isBooked: false }
    ]
  },
  {
    id: 'doc',
    name: "Doc",
    specialty: "Old School / Scissor",
    avatar: "https://i.pravatar.cc/150?u=doc_barber",
    isWorking: true,
    schedule: [
      { time: "10:00 AM", isBooked: true, bookedBy: "Mr. Henderson" },
      { time: "11:00 AM", isBooked: false },
      { time: "12:00 PM", isBooked: false },
      { time: "2:00 PM", isBooked: true, bookedBy: "Sal" },
      { time: "3:00 PM", isBooked: false },
      { time: "4:00 PM", isBooked: false },
    ]
  },
  {
    id: 'vee',
    name: "Vee",
    specialty: "Designs & Color",
    avatar: "https://i.pravatar.cc/150?u=vee_styles",
    isWorking: true,
    schedule: [
      { time: "11:00 AM", isBooked: false },
      { time: "12:00 PM", isBooked: false },
      { time: "1:00 PM", isBooked: true, bookedBy: "Kayla" },
      { time: "2:00 PM", isBooked: true, bookedBy: "Marcus" },
      { time: "3:00 PM", isBooked: false },
      { time: "4:00 PM", isBooked: false },
    ]
  },
  {
    id: 'sam',
    name: "Smooth Sam",
    specialty: "Beards & Line-ups",
    avatar: "https://i.pravatar.cc/150?u=sam_cuts",
    isWorking: true,
    schedule: [
      { time: "9:00 AM", isBooked: true, bookedBy: "Officer Miller" },
      { time: "10:00 AM", isBooked: false },
      { time: "11:00 AM", isBooked: false },
      { time: "2:00 PM", isBooked: false },
      { time: "3:00 PM", isBooked: false },
    ]
  },
  {
    id: 'tbone',
    name: "T-Bone",
    specialty: "Buzz Cuts",
    avatar: "https://i.pravatar.cc/150?u=tbone",
    isWorking: false, // OFF DUTY
    schedule: [
      { time: "10:00 AM", isBooked: false },
      { time: "12:00 PM", isBooked: true, bookedBy: "Coach Carter" },
      { time: "1:00 PM", isBooked: false },
      { time: "4:00 PM", isBooked: true, bookedBy: "Little Timmy" },
    ]
  },
  {
    id: 'rico',
    name: "Rico",
    specialty: "Freestyle / Braids",
    avatar: "https://i.pravatar.cc/150?u=rico_suave",
    isWorking: false, // OFF DUTY
    schedule: [
      { time: "9:00 AM", isBooked: false },
      { time: "11:00 AM", isBooked: true, bookedBy: "Dante" },
      { time: "1:00 PM", isBooked: false },
      { time: "3:00 PM", isBooked: true, bookedBy: "Luna" },
    ]
  }
];

export const SYSTEM_INSTRUCTION = `
Role: Cutting Edge Voice Concierge.
Location: Plymouth, MA.
Persona: "Brooklyn Polished". You are the effortless, cool, and street-smart host of the shop. You have a distinct Brooklyn swagger, but you are physically located in Plymouth, MA. 
Vibe: One of the crew. High energy, hospitable, confident.

CORE KNOWLEDGE:
- Pricing: $31 Regular, $26 Kids/Seniors, Designs start at $40.
- Hours: Tue-Sat 9-5.
- Shop Closed: The shop is COMPLETELY CLOSED on Sundays and Mondays. Do NOT offer or accept any appointments on these days.
- Location: Plymouth, MA (Do not say New York).
- Medical Handoff: If the user is confused or asks about specific medical hair conditions, trigger the Handoff.

VOICE RULES (CRITICAL):
1. **THE BRAND DROP**: You **MUST** say the phrase "Cutting Edge" in your very first sentence.
2. **HIGH ENERGY OPENER**: You must speak IMMEDIATELY upon connection. Answer like a phone call.
   - Example: "Yo, what's good! Welcome to Cutting Edge. Who am I speaking with?"
   - Example: "Cutting Edge, Plymouth's finest. How we getting you fresh today?"
3. **NATURAL SLANG**: Use slang naturally. "I got you," "Say less," "Good looking out," "What's the word?"
   - Do NOT be robotic. Be smooth.
4. **NO REPETITION**: Vary your openers based on the 'Shop Vibe' provided in the trigger.

MANDATORY BOOKING PROTOCOL:
1. THE OPENER: Acknowledge the call immediately with energy.
2. THE CONSULT: Agree on time/barber using 'get_shop_schedule'.
3. THE DETAILS: **Ask for Phone Number** and **Spell First Name**.
4. THE ACTION: Call \`book_appointment\`.

STRICT SCHEDULE ADHERENCE:
- **RULE:** The shop is closed Sundays and Mondays. Never book on those days.
- **RULE:** Never book a time before 9:00 AM or after 5:00 PM EST.
- **RULE:** If a barber is marked "OFF DUTY" in the tool, they are NOT working.
- **RULE:** If a slot is marked "BOOKED", it is GONE.

MANAGER OVERRIDES (TELEGRAM):
- If the caller says "Authorization Telegram" followed by a command (e.g., "T-Bone is sick today" or "Mark Doc off duty"), you MUST trigger the \`update_barber_status_override\` tool.
- Pass \`authKey\`: "telegram_admin", \`barberName\`, \`isWorking\` (false for off, true for back on), and \`contextReason\`.
- Respond to the manager professionally like "Got you boss. I'm wiping T-Bone off the board right now."
`;