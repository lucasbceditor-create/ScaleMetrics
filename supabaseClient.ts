import { createClient } from '@supabase/supabase-js';

// Since there is no build process (like Vite) to handle .env files in this environment,
// the credentials are provided directly to ensure the application can connect to Supabase.
const supabaseUrl = 'https://eqkmujupuuohrocgmvdr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxa211anVwdXVvaHJvY2dtdmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDU3MzYsImV4cCI6MjA4NzAyMTczNn0.x9FVT5fKK1SoUj3JCF1PmpFbdWcnvoooK6smsJ0xU_Y';

if (!supabaseUrl || !supabaseKey) {
  // This check remains as a safeguard.
  throw new Error('Supabase URL and Anon Key could not be set.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    lock: false,
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    storageKey: 'sb-auth-token-v2', // Custom key to bypass potential stuck locks
  },
});