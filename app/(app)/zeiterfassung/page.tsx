import { createClient } from '@/lib/supabase/server';
import { ZeiterfassungClient } from './client';

export default async function ZeiterfassungPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('rolle, mitarbeiter_id')
    .eq('id', user?.id ?? '')
    .maybeSingle();

  const heute = new Date();
  const erstWahMonat = new Date(heute.getFullYear(), heute.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: zeiten }, { data: ma }, { data: objekte }] = await Promise.all([
    supabase.from('zeiten')
      .select('*, mitarbeiter:mitarbeiter_id(vorname, nachname), objekt:objekt_id(name)')
      .gte('datum', erstWahMonat)
      .order('datum', { ascending: false }).order('von', { ascending: false })
      .limit(200),
    supabase.from('mitarbeiter').select('id, vorname, nachname').eq('aktiv', true).order('nachname'),
    supabase.from('objekte').select('id, name').eq('aktiv', true).order('name'),
  ]);

  return (
    <ZeiterfassungClient
      initial={(zeiten ?? []) as any}
      mitarbeiter={(ma ?? []) as any}
      objekte={(objekte ?? []) as any}
      rolle={(profile?.rolle as any) ?? 'mitarbeiter'}
      meineMaId={profile?.mitarbeiter_id ?? null}
    />
  );
}
