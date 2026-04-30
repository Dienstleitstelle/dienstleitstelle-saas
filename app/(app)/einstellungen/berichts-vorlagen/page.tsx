import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BerichtsVorlagenClient } from './client';

export default async function BerichtsVorlagenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('rolle').eq('id', user.id).maybeSingle();
  if (!profile || profile.rolle !== 'admin') redirect('/dashboard');

  const { data } = await supabase.from('berichts_vorlagen').select('*').order('name');
  return <BerichtsVorlagenClient initial={(data ?? []) as any} />;
}
