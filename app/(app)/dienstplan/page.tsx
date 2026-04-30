import { createClient } from '@/lib/supabase/server';
import { DienstplanClient } from './client';

export default async function DienstplanPage() {
  const supabase = await createClient();
  const [{ data: objekte }, { data: mitarbeiter }, { data: berufsgruppen }, { data: { user } }] = await Promise.all([
    supabase.from('objekte').select('*').eq('aktiv', true).order('name'),
    supabase.from('mitarbeiter').select('*').eq('aktiv', true).order('nachname'),
    supabase.from('berufsgruppen').selec