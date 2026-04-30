import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfilClient } from './client';

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('vorname, nachname, email, rolle')
    .eq('id', user.id)
    .maybeSingle();
  return <ProfilClient profile={profile} email={user.email ?? ''} />;
}
