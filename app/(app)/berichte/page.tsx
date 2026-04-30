import { createClient } from '@/lib/supabase/server';
import { BerichteClient } from './client';

export default async function BerichtePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles').select('rolle').eq('id', user?.id ?? '').maybeSingle();
  const rolle = profile?.rolle ?? 'mitarbeiter';

  const [{ data: alleVorlagen }, { data: eintraege }, { data: objekte }] = await Promise.all([
    supabase.from('berichts_vorlagen').select('*').eq('aktiv', true).order('name'),
    supabase.from('berichts_eintraege')
      .select('*, vorlage:vorlage_id(name, zweck), objekt:objekt_id(name), ersteller:created_by(vorname, nachname)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('objekte').select('id, name').eq('aktiv', true).order('name'),
  ]);

  const vorlagen = (alleVorlagen ?? []).filter((v: any) =>
    rolle === 'admin' || v.rolle_pflicht === 'alle' || v.rolle_pflicht === rolle
  );

  return <BerichteClient vorlagen={vorlagen as any} eintraege={(eintraege ?? []) as any} objekte={(objekte ?? []) as any} />;
}
