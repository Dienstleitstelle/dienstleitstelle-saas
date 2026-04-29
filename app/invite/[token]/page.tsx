'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [info, setInfo] = useState<{ email: string; firma: string; rolle: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invitations')
        .select('email, rolle, accepted_at, expires_at, tenants(name)')
        .eq('token', token)
        .maybeSingle();
      setLoading(false);
      if (error || !data) {
        setError('Einladung nicht gefunden.');
        return;
      }
      if (data.accepted_at) {
        setError('Diese Einladung wurde bereits akzeptiert.');
        return;
      }
      if (new Date(data.expires_at as string) < new Date()) {
        setError('Diese Einladung ist abgelaufen. Bitte den Admin um eine neue.');
        return;
      }
      setInfo({
        email: data.email,
        rolle: data.rolle,
        firma: (data.tenants as any)?.name || 'deinem Unternehmen',
      });
    })();
  }, [token]);

  async function accept() {
    if (!info) return;
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: info.email,
      options: {
        data: { invitation_token: token },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg0 p-4">
      <div className="w-full max-w-md rounded-xl border border-border1 bg-bg1 p-8">
        <div className="text-lg font-bold mb-1 text-text1">
          Dienst<span className="text-accent">Leitstelle</span>
        </div>

        {loading && <p className="text-text2 mt-4">Lade Einladung…</p>}

        {error && (
          <div className="mt-4 rounded-lg border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-3 text-sm">
            {error}
          </div>
        )}

        {info && !sent && (
          <>
            <h1 className="text-xl font-semibold mb-1 text-text1 mt-4">Einladung annehmen</h1>
            <p className="text-text2 text-sm mb-6">
              Du wurdest als <strong className="text-text1">{info.rolle}</strong> zu{' '}
              <strong className="text-text1">{info.firma}</strong> eingeladen.
            </p>
            <p className="text-text3 text-xs mb-4">
              Wir senden dir einen Anmeldelink an <strong>{info.email}</strong>.
            </p>
            <button
              onClick={accept}
              className="w-full py-2.5 rounded-lg bg-accent text-white font-semibold text-sm hover:opacity-90"
            >
              Anmeldelink anfordern
            </button>
          </>
        )}

        {sent && (
          <div className="mt-4 rounded-lg border border-green-700 bg-[var(--green-dim)] text-[var(--green)] p-4 text-sm">
            Anmeldelink wurde an {info?.email} geschickt. Klick darauf, um die Einladung anzunehmen.
          </div>
        )}
      </div>
    </div>
  );
}
