import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BerufsgruppenClient } from './client';

export default async function BerufsgruppenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('rolle').eq('id', user.id).maybeSingle();
  if (!profile || profile.rolle !== 'admin') redirect('/dashboard');

  const { data } = await supabase.from('berufsgruppen').select('*').order('name');
  return <BerufsgruppenClient initial={data ?? []} />;
}
