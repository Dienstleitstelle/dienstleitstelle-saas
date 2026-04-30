import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/mitarbeiter/einladen
// Body: { mitarbeiter_id?: string, email: string, vorname?: string, nachname?: string, rolle?: 'admin'|'leitung'|'mitarbeiter' }
// 1) Caller-Auth + Rolle pruefen
// 2) Invitation erstellen (Token wird automatisch generiert)
// 3) Magic-Link Mail schicken via supabase.auth.admin.inviteUserByEmail
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, rolle, id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Kein Tenant' }, { status: 403 });
  }
  if (profile.rolle !== 'admin' && profile.rolle !== 'leitung') {
    return NextResponse.json({ error: 'Nur Admin/Leitung darf einladen' }, { status: 403 });
  }

  const body = await request.json();
  const { mitarbeiter_id, email, vorname, nachname, rolle } = body as {
    mitarbeiter_id?: string;
    email?: string;
    vorname?: string;
    nachname?: string;
    rolle?: 'admin' | 'leitung' | 'mitarbeiter';
  };

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Gueltige E-Mail erforderlich' }, { status: 400 });
  }
  const targetRolle = rolle ?? 'mitarbeiter';

  // Pruefen ob bereits offene Einladung fuer diese E-Mail im Tenant existiert
  const { data: existing } = await supabase
    .from('invitations')
    .select('id, token, accepted_at, expires_at')
    .eq('tenant_id', profile.tenant_id)
    .eq('email', email)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let invitationToken: string;
  let invitationId: string;

  if (existing && new Date(existing.expires_at as string) > new Date()) {
    // Offene Einladung wiederverwenden
    invitationToken = existing.token as string;
    invitationId = existing.id as string;
  } else {
    // Neue Einladung anlegen
    const { data: inv, error: invErr } = await supabase
      .from('invitations')
      .insert({
        tenant_id: profile.tenant_id,
        email,
        rolle: targetRolle,
        vorname: vorname || null,
        nachname: nachname || null,
        invited_by: profile.id,
        mitarbeiter_id: mitarbeiter_id || null,
      })
      .select('id, token')
      .single();
    if (invErr || !inv) {
      return NextResponse.json({ error: invErr?.message ?? 'Konnte Einladung nicht anlegen' }, { status: 500 });
    }
    invitationToken = inv.token as string;
    invitationId = inv.id as string;
  }

  // Magic-Link Mail via Service-Role schicken
  const origin = new URL(request.url).origin;
  const service = createServiceRoleClient();
  const { error: mailErr } = await service.auth.admin.inviteUserByEmail(email, {
    data: { invitation_token: invitationToken, vorname, nachname },
    redirectTo: `${origin}/auth/callback?next=/dashboard`,
  });

  // Wenn der User bereits in auth.users existiert, faellt inviteUserByEmail mit
  // "already been registered" zurueck. Dann benutze magicLink statt invite.
  if (mailErr && mailErr.message.toLowerCase().includes('already')) {
    const { error: linkErr } = await service.auth.signInWithOtp({
      email,
      options: {
        data: { invitation_token: invitationToken },
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });
    if (linkErr) {
      return NextResponse.json({
        ok: true,
        warnung: `Einladung angelegt, aber Mail-Versand fehlgeschlagen: ${linkErr.message}. Link manuell weitergeben.`,
        invite_link: `${origin}/invite/${invitationToken}`,
        invitation_id: invitationId,
      });
    }
  } else if (mailErr) {
    return NextResponse.json({
      ok: true,
      warnung: `Einladung angelegt, aber Mail-Versand fehlgeschlagen: ${mailErr.message}. Link manuell weitergeben.`,
      invite_link: `${origin}/invite/${invitationToken}`,
      invitation_id: invitationId,
    });
  }

  return NextResponse.json({
    ok: true,
    invitation_id: invitationId,
    invite_link: `${origin}/invite/${invitationToken}`,
  });
}
