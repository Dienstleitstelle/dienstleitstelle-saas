import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/invite/accept
// Body: { token: string }
// Generiert einen Action-Link, der den User direkt einloggt - OHNE Mailversand.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = body?.token as string | undefined;
  if (!token) return NextResponse.json({ error: 'Token fehlt' }, { status: 400 });

  const service = createServiceRoleClient();

  // 1) Einladung laden
  const { data: inv, error: invErr } = await service
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (invErr || !inv) {
    return NextResponse.json({ error: 'Einladung nicht gueltig oder abgelaufen' }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/auth/callback?next=/dashboard`;

  // 2) Existiert ein auth-User mit dieser E-Mail?
  const { data: existingId } = await service
    .rpc('find_auth_user_by_email', { p_email: inv.email });

  if (existingId) {
    // Bestehender User: profile + mitarbeiter direkt verlinken, dann magiclink
    await service.rpc('accept_invitation', { p_token: token, p_user_id: existingId });

    const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: inv.email,
      options: { redirectTo },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      return NextResponse.json({ error: linkErr?.message ?? 'Konnte Login-Link nicht erzeugen' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, action_link: linkData.properties.action_link });
  }

  // 3) Neuer User: invite-Link generieren (sendet keine Mail bei generateLink)
  // Trigger handle_new_user verarbeitet invitation_token aus user_metadata.
  const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
    type: 'invite',
    email: inv.email,
    options: {
      data: { invitation_token: token, vorname: inv.vorname, nachname: inv.nachname },
      redirectTo,
    },
  });
  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: linkErr?.message ?? 'Konnte Aktivierungslink nicht erzeugen' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action_link: linkData.properties.action_link });
}
