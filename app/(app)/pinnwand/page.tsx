import { createClient } from '@/lib/supabase/server';
import { PinnwandClient } from './client';

export default async function PinnwandPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('rolle')
    .eq('id', user?.id ?? '')
    .maybeSingle();

  const { data } = await supabase
    .from('pinnwand')
    .select('*, ersteller:created_by(vorname, nachname)')
    .order('angeheftet', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <PinnwandClient
      initial={(data ?? []) as any}
      canPost={profile?.rolle === 'admin' || profile?.rolle === 'leitung'}
    />
  );
}
