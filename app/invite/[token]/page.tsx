'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [info, setInfo] = useState<{ email: string; firma: string; rolle: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invitations')
        .select('email, rolle, accepted_at, expires_at, tenants(name)')
        .eq('token', token)
        .maybeSingle();
      setLoading(false);
      if (error || !data) { setError('Einladung nicht gefunden.'); return; }
      if (data.accepted_at) { setError('Diese Einladung wurde bereits aktiviert. Du kannst dich direkt einloggen.'); return; }
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

  async function aktivieren() {
    setError(null); setActivating(true);
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const j = await res.json();
      if (!res.ok || !j.action_link) {
        setError(j?.error ?? 'Konnte Account nicht aktivieren');
        setActivating(false);
        return;
      }
      // Browser an den Action-Link schicken -> Supabase verifiziert + redirected an /auth/callback
      window.location.href = j.action_link;
    } catch (e: any) {
      setError(e?.message ?? 'Netzwerkfehler');
      setActivating(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg0 p-4">
      <div className="w-full max-w-md rounded-xl border border-border1 bg-bg1 p-8">
        <div className="text-lg font-bold mb-1 text-text1">
          Dienst<span className="text-accent">Leitstelle</span>
        </div>

        {loading && <p className="text-text2 mt-4">Lade Einladung...</p>}

        {error && (
          <div className="mt-4 rounded-lg border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-3 text-sm">
            {error}
          </div>
        )}

        {info && !error && (
          <>
            <h1 className="text-xl font-semibold mb-1 text-text1 mt-4">Account aktivieren</h1>
            <p className="text-text2 text-sm mb-6">
              Du wurdest als <strong className="text-text1">{info.rolle}</strong> zu{' '}
              <strong className="text-text1">{info.firma}</strong> eingeladen.
            </p>
            <p className="text-text3 text-xs mb-4">
              Anmelde-Adresse: <strong className="text-text1">{info.email}</strong>
            </p>
            <button
              onClick={aktivieren}
              disabled={activating}
              className="w-full py-2.5 rounded-lg bg-accent text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {activating ? 'Aktiviere...' : 'Account aktivieren & einloggen'}
            </button>
            <p className="text-[10px] text-text3 mt-3 text-center">
              Mit einem Klick: kein Passwort, keine zusaetzliche Mail noetig.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
