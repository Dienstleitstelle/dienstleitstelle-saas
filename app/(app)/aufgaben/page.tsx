import { createClient } from '@/lib/supabase/server';
import { AufgabenClient } from './client';

export default async function AufgabenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('rolle, mitarbeiter_id')
    .eq('id', user?.id ?? '')
    .maybeSingle();

  const [{ data: aufgaben }, { data: ma }, { data: objekte }] = await Promise.all([
    supabase.from('aufgaben')
      .select('*, mitarbeiter:mitarbeiter_id(vorname, nachname), objekt:objekt_id(name)')
      .order('erledigt')
      .order('faellig_am', { ascending: true, nullsFirst: false })
      .limit(200),
    supabase.from('mitarbeiter').select('id, vorname, nachname').eq('aktiv', true).order('nachname'),
    supabase.from('objekte').select('id, name').eq('aktiv', true).order('name'),
  ]);

  return (
    <AufgabenClient
      initial={(aufgaben ?? []) as any}
      mitarbeiter={(ma ?? []) as any}
      objekte={(objekte ?? []) as any}
      rolle={(profile?.rolle as any) ?? 'mitarbeiter'}
      meineMaId={profile?.mitarbeiter_id ?? null}
    />
  );
}
