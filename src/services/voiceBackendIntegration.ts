/**
 * Voice Backend Integration Service
 *
 * This service connects the voice concierge tool calls to the backend API endpoints.
 * It handles shop schedule queries and appointment bookings.
 */

export interface ScheduleSlot {
  time: string;
  status: 'AVAILABLE' | 'BOOKED (UNAVAILABLE)';
  bookedBy?: string;
}

export interface BarberSchedule {
  barber: string;
  status: 'WORKING' | 'OFF DUTY (UNAVAILABLE TODAY)';
  specialty?: string;
  slots: ScheduleSlot[];
}

export interface ScheduleResponse {
  schedule: BarberSchedule[];
}

export interface BookingRequest {
  barberName: string;
  time: string;
  customerName: string;
  phoneNumber: string;
  shopId?: number;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  appointment?: {
    id: string;
    barberName: string;
    time: string;
    customerName: string;
    phoneNumber: string;
    createdAt: string;
  };
  error?: string;
}

/**
 * Backend API base URL
 * Falls back to empty string for development/testing
 */
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || '';

/**
 * Get current shop schedule from backend
 *
 * @param shopId - Shop identifier (default: 1)
 * @returns Promise with barber schedule data
 */
export async function getShopSchedule(shopId: number = 1, date?: string): Promise<ScheduleResponse> {
  try {
    const queryParams = `shopId=${shopId}${date ? `&date=${date}` : ''}`;
    const response = await fetch(`${BACKEND_API_URL}/api/schedule?${queryParams}`);

    if (!response.ok) {
      console.warn(`Backend API unavailable (${response.status}), using mock data`);
      // Return mock data when backend is not available
      return getMockSchedule(date);
    }

    const data: ScheduleResponse = await response.json();
    return data;
  } catch (error) {
    console.warn('Error fetching shop schedule, using mock data:', error);
    // Return mock data when backend fails
    return getMockSchedule(date);
  }
}

import { isPastTime, INITIAL_BARBERS } from '../components/concierge/constants';

/**
 * Get mock schedule data for testing without backend
 * Simulates different schedules based on the chosen date.
 */
function getMockSchedule(dateStr?: string): ScheduleResponse {
  // If a date is provided, check what day of the week it is
  let dayOfWeek = -1;
  const todayEST = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  const targetDate = dateStr || todayEST;

  if (targetDate) {
    const d = new Date(targetDate + "T12:00:00Z"); // middle of day to avoid timezone shift back
    dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  }

  // Create base dynamic schedule from INITIAL_BARBERS to ensure the whole roster is accounted for
  const schedule: ScheduleResponse = {
    schedule: INITIAL_BARBERS.map(b => ({
      barber: b.name,
      status: b.isWorking ? "WORKING" : "OFF DUTY (UNAVAILABLE TODAY)",
      specialty: b.specialty,
      slots: b.schedule.map(s => {
        const slot: any = {
          time: s.time,
          status: s.isBooked ? "BOOKED (UNAVAILABLE)" : "AVAILABLE"
        };
        if (s.bookedBy) {
          slot.bookedBy = s.bookedBy;
        }
        return slot;
      })
    }))
  };

  // Apply day-based closures. The shop is completely closed on Sundays (0) and Mondays (1).
  if (dayOfWeek === 0 || dayOfWeek === 1) {
    schedule.schedule.forEach(barber => {
      barber.status = "OFF DUTY (SHOP CLOSED)" as any;
      barber.slots.forEach(s => s.status = "BOOKED (UNAVAILABLE)");
    });
  } else {
    // Other specific days off for specific barbers
    // Fast Eddie is off on Tuesdays (day 2)
    if (dayOfWeek === 2) {
      const eddie = schedule.schedule.find(b => b.barber === "Fast Eddie");
      if (eddie) {
        eddie.status = "OFF DUTY (UNAVAILABLE TODAY)";
        eddie.slots.forEach(s => s.status = "BOOKED (UNAVAILABLE)");
      }
    }
  }

  // Automatically mark past times as booked ONLY IF the date is exactly today in EST
  if (targetDate === todayEST) {
    schedule.schedule.forEach(barber => {
      barber.slots.forEach(slot => {
        if (slot.status === 'AVAILABLE' && isPastTime(slot.time, targetDate)) {
          slot.status = 'BOOKED (UNAVAILABLE)';
          slot.bookedBy = 'Past Time';
        }
      });
    });
  }

  return schedule;
}

/**
 * Book an appointment via backend API
 *
 * @param bookingData - Appointment booking details
 * @returns Promise with booking result
 */
export async function bookAppointment(bookingData: BookingRequest): Promise<BookingResponse> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...bookingData,
        shopId: bookingData.shopId || 1,
      }),
    });

    if (!response.ok) {
      console.warn(`Backend API unavailable (${response.status}), using mock booking`);
      // Return mock success when backend is not available
      return getMockBooking(bookingData);
    }

    const data: BookingResponse = await response.json();
    return data;
  } catch (error) {
    console.warn('Error booking appointment, using mock booking:', error);
    // Return mock success when backend fails
    return getMockBooking(bookingData);
  }
}

/**
 * Get mock booking response for testing without backend
 */
function getMockBooking(bookingData: BookingRequest): BookingResponse {
  return {
    success: true,
    message: `Perfect! I've booked ${bookingData.time} with ${bookingData.barberName} for ${bookingData.customerName}. You'll receive a confirmation text at ${bookingData.phoneNumber} shortly.`,
    appointment: {
      id: `mock-${Date.now()}`,
      barberName: bookingData.barberName,
      time: bookingData.time,
      customerName: bookingData.customerName,
      phoneNumber: bookingData.phoneNumber,
      createdAt: new Date().toISOString(),
    }
  };
}

/**
 * Handle voice tool calls by routing to appropriate backend function
 *
 * This function is called by the useLiveSession hook when the voice AI
 * invokes a tool (function calling).
 *
 * @param toolName - Name of the tool being called
 * @param args - Arguments passed to the tool
 * @returns Promise with tool response
 */
export async function handleVoiceToolCall(
  toolName: string,
  args: any
): Promise<any> {
  switch (toolName) {
    case 'get_shop_schedule':
      return await getShopSchedule(args.shopId || 1, args.date);

    case 'book_appointment':
      return await bookAppointment({
        barberName: args.barberName,
        time: args.time,
        customerName: args.customerName,
        phoneNumber: args.phoneNumber,
        shopId: args.shopId || 1,
      });

    case 'update_barber_status_override':
      return { success: true, message: 'Barber status overridden by manager.' };

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Format schedule data for voice AI response
 *
 * Converts the backend schedule data into a format that's easy
 * for the voice AI to communicate to the user.
 *
 * @param schedule - Schedule data from backend
 * @returns Formatted string for voice output
 */
export function formatScheduleForVoice(schedule: ScheduleResponse): string {
  const workingBarbers = schedule.schedule.filter((b) => b.status === 'WORKING');

  if (workingBarbers.length === 0) {
    return "I'm sorry, there are no barbers working today.";
  }

  let response = `We have ${workingBarbers.length} barber${workingBarbers.length > 1 ? 's' : ''} working today. `;

  workingBarbers.forEach((barber) => {
    response += `${barber.barber} is available at: `;
    const availableSlots = barber.slots.filter((s) => s.status === 'AVAILABLE');
    const times = availableSlots.map((s) => s.time).join(', ');
    response += times + '. ';
  });

  return response;
}

/**
 * Format booking result for voice AI response
 *
 * @param result - Booking result from backend
 * @returns Formatted string for voice output
 */
export function formatBookingForVoice(result: BookingResponse): string {
  if (result.success) {
    return result.message;
  } else {
    return `I'm sorry, ${result.message || 'the booking could not be completed.'}`;
  }
}
