import { createClient } from '@supabase/supabase-js';

// Pastikan untuk mengisi Environment Variables ini di Vercel nantinya
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || ''; // Disarankan menggunakan Service Role Key agar aman (hanya diakses via backend)

export const supabase = createClient(supabaseUrl, supabaseKey);
