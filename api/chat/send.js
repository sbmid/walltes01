import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { room_id, sender_id, type = 'text', content } = req.body;
  if (!room_id || !sender_id || !content) {
    return res.status(400).json({ error: 'room_id, sender_id, dan content wajib diisi' });
  }

  try {
    // 1. Simpan pesan itu ke tabel messages
    const { error: msgError } = await supabase
      .from('messages')
      .insert([{ room_id, sender_id, type, content }]);
      
    if (msgError) throw msgError;

    // 2. Update waktu last_activity di tabel rooms (mereset timer 20 menit)
    const { error: roomError } = await supabase
      .from('rooms')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', room_id);
      
    if (roomError) throw roomError;

    return res.status(200).json({ success: true, message: 'Pesan terkirim' });
  } catch (error) {
    console.error('Send error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
