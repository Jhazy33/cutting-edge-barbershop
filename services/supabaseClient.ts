
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// PERMANENT FIX: Disable realtime completely to prevent WebSocket errors
// Issue: Supabase URL uses HTTP (ws://) but site is accessed via HTTPS
// Browsers block insecure WebSocket connections from secure pages
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'public' },
    // Completely disable realtime to prevent any WebSocket connection attempts
    realtime: false,
});
