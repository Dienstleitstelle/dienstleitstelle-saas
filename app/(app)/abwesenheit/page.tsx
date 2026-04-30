import { createClient } from '@/lib/supabase/server';
import { AbwesenheitClient } from './client';

export default async function AbwesenheitPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('rolle, mitarbeiter_id')
    .eq('id', user?.id ?? '')
    .maybeSingle();

  const { data: urlaube } = await supabase
    .from('urlaube')
    .select('*, mitarbeiter:mitarbeiter_id(id, vorname, nachname, vorgesetzter_id)')
    .order('von', { ascending: false })
    .limit(100);

  return (
    <AbwesenheitClient
      initial={(urlaube ?? []) as any}
      rolle={(profile?.rolle as any) ?? 'mitarbeiter'}
      meineMaId={profile?.mitarbeiter_id ?? null}
    />
  );
}
