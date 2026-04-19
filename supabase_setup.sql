-- TAHAP 1: BIKIN GUDANG DATA (TABEL SUPABASE) --

-- 1. Tabel rooms
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id TEXT NOT NULL,
  user_b_id TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active')),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TAHAP 2: SAPU JAGAT 20 MENIT (PG_CRON) --

-- Aktifkan pg_cron (Note: Jika error, pastikan pg_cron dicentang di Database -> Extensions pada Dashboard Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Buat jadwa penghapusan otomatis setiap menit (*)
SELECT cron.schedule(
  'cleanup-inactive-rooms', -- nama cron job
  '* * * * *',              -- berjalan setiap 1 menit
  $$
  DELETE FROM rooms
  WHERE status = 'active'
  AND last_activity < NOW() - INTERVAL '20 minutes';
  $$
);
