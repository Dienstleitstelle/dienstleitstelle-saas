import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/mitarbeiter/einladen
// Body: { mitarbeiter_id?, email, vorname?, nachname?, rolle?, sendMail?: boolean }
// 1) Caller pruefen (admin/leitung)
// 2) Einladung erstellen (oder bestehende offene wiederverwenden)
// 3) Optional Magic-Link-Mail schicken (nur wenn sendMail=true)
// 4) IMMER invite_link zurueckgeben
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
  const {
    mitarbeiter_id, email, vorname, nachname, rolle,
    sendMail = false,
  } = body as {
    mitarbeiter_id?: string;
    email?: string;
    vorname?: string;
    nachname?: string;
    rolle?: 'admin' | 'leitung' | 'mitarbeiter';
    sendMail?: boolean;
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
    invitationToken = existing.token as string;
    invitationId = existing.id as string;
  } else {
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

  const origin = new URL(request.url).origin;
  const invite_link = `${origin}/invite/${invitationToken}`;

  let mailStatus: 'skipped' | 'sent' | 'failed' = 'skipped';
  let mailError: string | undefined;

  if (sendMail) {
    const service = createServiceRoleClient();
    const { error: mailErr } = await service.auth.admin.inviteUserByEmail(email, {
      data: { invitation_token: invitationToken, vorname, nachname },
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    });
    if (mailErr && mailErr.message.toLowerCase().includes('already')) {
      const { error: linkErr } = await service.auth.signInWithOtp({
        email,
        options: {
          data: { invitation_token: invitationToken },
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });
      if (linkErr) { mailStatus = 'failed'; mailError = linkErr.message; }
      else { mailStatus = 'sent'; }
    } else if (mailErr) {
      mailStatus = 'failed'; mailError = mailErr.message;
    } else {
      mailStatus = 'sent';
    }
  }

  return NextResponse.json({
    ok: true,
    invitation_id: invitationId,
    invite_link,
    mail_status: mailStatus,
    mail_error: mailError,
    email,
  });
}
