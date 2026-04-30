import { createClient } from '@/lib/supabase/server';
import { MitarbeiterClient } from './client';

export default async function MitarbeiterPage() {
  const supabase = await createClient();
  const [{ data: ma }, { data: bg }] = await Promise.all([
    supabase.from('mitarbeiter').select('*').order('nachname'),
    supabase.from('berufsgruppen