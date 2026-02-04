
import { supabase } from './supabaseClient';

export interface Appointment {
    id: string;
    barber_id: string;
    start_time: string; // ISO string
    status: 'available' | 'booked' | 'locked';
    customer_name?: string;
    customer_phone?: string;
}

export const getAppointmentsForDay = async (date: Date) => {
    const startStr = date.toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('start_time', `${startStr}T00:00:00`)
        .lt('start_time', `${startStr}T23:59:59`)
        .or('status.eq.booked,status.eq.locked');

    if (error) throw error;
    return data as Appointment[];
};

export const subscribeToAppointments = (callback: (payload: any) => void) => {
    return supabase
        .channel('public:appointments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, callback)
        .subscribe();
};

export const lockSlot = async (barberId: string, time: Date) => {
    const { data, error } = await supabase.from('appointments').insert({
        barber_id: barberId,
        start_time: time.toISOString(),
        status: 'locked',
        locked_at: new Date().toISOString()
    }).select();
    if (error) throw error;
    return data;
};

export const bookSlot = async (appointmentId: string, name: string, phone: string) => {
    // If updating a locked slot
    const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'booked', customer_name: name, customer_phone: phone })
        .eq('id', appointmentId)
        .select();
    if (error) throw error;
    return data;
};

// Direct booking without locking first (Atomic insert)
export const bookNewSlot = async (barberId: string, time: Date, name: string, phone: string) => {
    const { data, error } = await supabase.from('appointments').insert({
        barber_id: barberId,
        start_time: time.toISOString(),
        status: 'booked',
        customer_name: name,
        customer_phone: phone
    }).select();
    if (error) throw error;
    return data;
};
