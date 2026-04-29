import { createClient } from '@/lib/supabase/server';
import { MitarbeiterClient } from './client';

export default async function MitarbeiterPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('mitarbeiter')
    .select('*')
    .order('nachname');
  return <MitarbeiterClient initial={data ?? []} />;
}
