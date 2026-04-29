import { createClient } from '@/lib/supabase/server';
import { EinladungenClient } from './client';

export default async function EinladungenPage() {
  const supabase = await createClient();
  const { data: einl } = await supabase
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false });
  return <EinladungenClient initial={einl ?? []} />;
}
