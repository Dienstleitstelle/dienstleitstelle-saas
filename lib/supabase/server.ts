import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // wenn von einer Server-Komponente aufgerufen, schluckt Next die Schreibversuche;
            // für Auth-Cookies kümmert sich die Middleware
          }
        },
      },
    }
  );
}

/**
 * Service-Role-Client — umgeht RLS. Nur in Server-Code aufrufen, NIE im Browser.
 * Beispiel: bei Signup einen Tenant + Profile-Eintrag anlegen, bevor RLS-Kontext gesetzt ist.
 */
export function createServiceRoleClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
