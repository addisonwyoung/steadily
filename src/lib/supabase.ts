import { createClient } from '@supabase/supabase-js';

// Vite reads these settings from .env.local during development.
// VITE_ values are included in browser code: use only a publishable key here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart Vite.',
  );
}

// Export one shared client. Later, features will import it to sign in or query data.
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
