import { createClient } from '@/lib/supabase/server';
import { DienstplanClient } from './client';

export default async function DienstplanPage() {
  const supabase = await createClient();
  const [{ data: objekte }, { data: mitarbeiter }] = await Promise.all([
    supabase.from('objekte').select('*').order('name'),
    supabase.from('mitarbeiter').select('*').order('nachname'),
  ]);
  return (
    <DienstplanClient
      objekte={objekte ?? []}
      mitarbeiter={mitarbeiter ?? []}
    />
  );
}
