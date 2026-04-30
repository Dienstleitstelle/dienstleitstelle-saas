import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BerichtDetailClient } from './client';

export default async function BerichtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: bericht } = await supabase
    .from('berichts_eintraege')
    .select('*, vorlage:vorlage_id(name, zweck, felder), objekt:objekt_id(name), ersteller:created_by(vorname, nachname), mitarbeiter:mitarbeiter_id(vorname, nachname)')
    .eq('id', id).maybeSingle();

  if (!bericht) notFound();

  const { data: lesebestaetigungen } = await supabase
    .from('berichts_lesebestaetigungen')
    .select('*, user:user_id(vorname, nachname)')
    .eq('eintrag_id', id)
    .order('gelesen_at');

  const habeIchGelesen = lesebestaetigungen?.some((l: any) => l.user_id === user?.id) ?? false;

  return (
    <BerichtDetailClient
      bericht={bericht as any}
      lesebestaetigungen={(lesebestaetigungen ?? []) as any}
      habeIchGelesen={habeIchGelesen}
      userId={user?.id ?? ''}
    />
  );
}
