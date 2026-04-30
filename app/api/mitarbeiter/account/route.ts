import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/mitarbeiter/account
// Body: { mitarbeiter_id, email, vorname?, nachname?, rolle?, password }
// 1) Caller ist admin/leitung pruefen
// 2) Wenn auth-User existiert -> Passwort updaten + profile/mitarbeiter verknuepfen
//    Sonst: auth-User mit password anlegen (email_confirm = true), profile + mitarbeiter verknuepfen
// 3) Returns { ok, email, password, action: 'created'|'updated' }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, rolle, id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Kein Tenant' }, { status: 403 });
  if (profile.rolle !== 'admin' && profile.rolle !== 'leitung') {
    return NextResponse.json({ error: 'Nur Admin/Leitung darf Accounts anlegen' }, { status: 403 });
  }

  const body = await request.json();
  const { mitarbeiter_id, email, vorname, nachname, rolle, password } = body as {
    mitarbeiter_id?: string;
    email?: string; vorname?: string; nachname?: string;
    rolle?: 'admin'|'leitung'|'mitarbeiter';
    password?: string;
  };

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Gueltige E-Mail erforderlich' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Passwort muss mindestens 8 Zeichen haben' }, { status: 400 });
  }
  const targetRolle = rolle ?? 'mitarbeiter';

  const service = createServiceRoleClient();

  // Existiert User schon?
  const { data: existingId } = await service
    .rpc('find_auth_user_by_email', { p_email: email });

  let userId: string;
  let action: 'created' | 'updated';

  if (existingId) {
    // Passwort updaten (admin)
    const { error: upErr } = await service.auth.admin.updateUserById(existingId as string, {
      password,
      email_confirm: true,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    userId = existingId as string;
    action = 'updated';
  } else {
    const { data: created, error: cErr } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { vorname, nachname, created_by_admin: true },
    });
    if (cErr || !created?.user) {
      return NextResponse.json({ error: cErr?.message ?? 'Konnte User nicht anlegen' }, { status: 500 });
    }
    userId = created.user.id;
    action = 'created';
  }

  // Profile aktualisieren / anlegen (Trigger setzt initial nur Email; wir setzen tenant + rolle + verknuepfung)
  const { error: pfErr } = await service
    .from('profiles')
    .upsert({
      id: userId,
      tenant_id: profile.tenant_id,
      rolle: targetRolle,
      vorname: vorname || null,
      nachname: nachname || null,
      email,
      mitarbeiter_id: mitarbeiter_id || null,
    }, { onConflict: 'id' });
  if (pfErr) return NextResponse.json({ error: 'Profile-Verknuepfung fehlgeschlagen: ' + pfErr.message }, { status: 500 });

  if (mitarbeiter_id) {
    const { error: maErr } = await service
      .from('mitarbeiter')
      .update({ user_id: userId })
      .eq('id', mitarbeiter_id);
    if (maErr) return NextResponse.json({ error: 'Mitarbeiter-Verknuepfung fehlgeschlagen: ' + maErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email, password, action });
}
