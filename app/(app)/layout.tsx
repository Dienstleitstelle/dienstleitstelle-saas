import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('rolle, vorname, nachname, tenant_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) redirect('/login');
  if (!profile.tenant_id) redirect('/onboarding');

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', profile.tenant_id)
    .maybeSingle();

  return (
    <div className="md:flex min-h-screen">
      <Sidebar
        rolle={profile.rolle}
        vorname={profile.vorname}
        nachname={profile.nachname}
        firma={tenant?.name ?? ''}
      />
      <main className="flex-1 min-w-0 bg-bg0">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
