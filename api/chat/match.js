import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    // Cari room yang sedang waiting (menunggu teman)
    const { data: waitingRooms, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('status', 'waiting')
      .is('user_b_id', null)
      .limit(1);

    if (fetchError) throw fetchError;

    if (waitingRooms && waitingRooms.length > 0) {
      const room = waitingRooms[0];
      
      // Jika user yang sama nembak api lagi padahal dia masih nunggu
      if (room.user_a_id === user_id) {
        return res.status(200).json({ message: 'Masih menunggu teman masuk...', room_id: room.id, status: 'waiting' });
      }

      // ADA TEMAN: Masukkan user ini sebagai user_b_id dan aktifkan room
      const { data: updatedRoom, error: updateError } = await supabase
        .from('rooms')
        .update({ 
            user_b_id: user_id, 
            status: 'active', 
            last_activity: new Date().toISOString() 
        })
        .eq('id', room.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return res.status(200).json({ message: 'Teman ditemukan!', room_id: updatedRoom.id, status: 'active' });
    
    } else {
      // TIDAK ADA TEMAN: Bikin antrean baru (room baru)
      const { data: newRoom, error: insertError } = await supabase
        .from('rooms')
        .insert([{ user_a_id: user_id, status: 'waiting' }])
        .select()
        .single();

      if (insertError) throw insertError;
      return res.status(200).json({ message: 'Mencari teman...', room_id: newRoom.id, status: 'waiting' });
    }
  } catch (error) {
    console.error('Match error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
