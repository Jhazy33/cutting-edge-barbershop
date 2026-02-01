
import { ServiceItem } from '../types';

const SUPABASE_URL = 'http://109.199.118.38:8000';
// Only publicly safe key (Anon) should be client-side. 
// Ideally via env var (VITE_SUPABASE_ANON_KEY), but hardcoding for YOLO/Demo.
const SUPABASE_ANON_KEY = '81c531e410a4cf3fbda846010d243d75ba86df05a67936174c7dea40448e9d20';

export async function fetchLiveServices(): Promise<ServiceItem[]> {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/services?select=*&order=price.asc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch from Supabase:', response.statusText);
            return [];
        }

        const data = await response.json();

        // Map DB columns to Frontend types
        return data.map((item: any) => ({
            id: item.id,
            title: item.name,
            price: `$${item.price}`,
            description: item.category === 'Standard' ? `${item.duration_minutes} min service` : item.category, // Fallback desc
            meta: `${item.duration_minutes} Mins`
        }));

    } catch (error) {
        console.error("Supabase connection error:", error);
        return [];
    }
}
