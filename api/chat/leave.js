import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { room_id } = req.body;
  if (!room_id) return res.status(400).json({ error: 'room_id is required' });

  try {
    // Menghapus room. Karena tabel "messages" punya relasi ON DELETE CASCADE, 
    // semua riwayat pesan di room ini otomatis ikut terhapus di database.
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', room_id);
      
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Obrolan diakhiri. Room berhasil dihapus.' });
  } catch (error) {
    console.error('Leave error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
