import { supabase } from '../../utils/supabase.js';

// Utilitas delay untuk Long Polling
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { room_id, last_message_id } = req.query;
  if (!room_id) return res.status(400).json({ error: 'room_id is required' });

  const maxAttempts = 10; // Max iterasi (misal 10 detik agar tidak kena timeout Vercel)
  const waitTimeMs = 1000; // Jeda tiap iterasi 1 detik

  try {
    // Cek apakah room masih ada (belum dihapus oleh /leave atau cron job Supabase)
    const { data: roomCheck, error: roomErr } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('id', room_id)
      .single();

    if (roomErr || !roomCheck) {
      return res.status(404).json({ error: 'Room sudah tidak aktif/dihapus karena tidak ada respons atau diakhiri' });
    }

    // LONG POLLING LOOP
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('room_id', room_id)
        .order('created_at', { ascending: true });

      const { data: messages, error } = await query;
      if (error) throw error;

      // Filter pesan baru berdasarkan last_message_id yang dikirim client
      let newMessages = messages;
      if (last_message_id && messages.length > 0) {
        const lastIndex = messages.findIndex((m) => m.id === last_message_id);
        if (lastIndex !== -1) {
          // Ambil semua pesan setelah index terakhir yang dibaca client
          newMessages = messages.slice(lastIndex + 1);
        }
      }

      // Jika ada pesan baru, langsung kirim JSON
      if (newMessages.length > 0) {
        return res.status(200).json({ 
          success: true, 
          messages: newMessages,
          room_status: roomCheck.status
        });
      }

      // Jika masih kosong, tahan request (delay)
      await delay(waitTimeMs);
      
      // Sesekali kita bisa mengecek status room kalau perlu, 
      // tapi untuk menekan hit database Supabase, delay memori saja cukup.
    }

    // Jika sampai maxAttempts (10 detik) belum ada pesan baru, suruh client request ulang
    return res.status(200).json({ success: true, messages: [], status: 'timeout' });

  } catch (error) {
    console.error('Poll error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
