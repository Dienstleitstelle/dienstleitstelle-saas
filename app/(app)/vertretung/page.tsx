import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { VertretungClient } from './client';

export default async function VertretungPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('rolle').eq('id', user.id).maybeSingle();
  if (!profile || (profile.rolle !== 'admin' && profile.rolle !== 'leitung')) redirect('/dashboard');

  const [{ data: vertretungen }, { data: kollegen }] = await Promise.all([
    supabase.from('vertretungen')
      .select('*, vertreter:vertreter_id(vorname, nachname, email)')
      .eq('vertretene_id', user.id)
      .order('von', { ascending: false }),
    supabase.from('profiles')
      .select('id, vorname, nachname, email, rolle')
      .neq('id', user.id),
  ]);

  return <VertretungClient initial={(vertretungen ?? []) as any} kollegen={(kollegen ?? []) as any} />;
}
