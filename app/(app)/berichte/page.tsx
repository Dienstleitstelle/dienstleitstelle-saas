import { createClient } from '@/lib/supabase/server';
import { BerichteClient } from './client';

export default async function BerichtePage() {
  const supabase = await createClient();
  const [{ data: vorlagen }, { data: eintraege }, { data: objekte }] = await Promise.all([
    supabase.from('berichts_vorlagen').select('*').eq('aktiv', true).order('name'),
    supabase.from('berichts_eintraege')
      .select('*, vorlage:vorlage_id(name, zweck), objekt:objekt_id(name), ersteller:created_by(vorname, nachname)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('objekte').select('id, name').eq('aktiv', true).order('name'),
  ]);
  return <BerichteClient vorlagen={(vorlagen ?? []) as any} eintraege={(eintraege ?? []) as any} objekte={(objekte ?? []) as any} />;
}
