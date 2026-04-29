import { createClient } from '@/lib/supabase/server';
import { ObjekteClient } from './client';

export default async function ObjektePage() {
  const supabase = await createClient();
  const { data } = await supabase.from('objekte').select('*').order('name');
  return <ObjekteClient initial={data ?? []} />;
}
