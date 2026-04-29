'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { vorname, nachname },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg0 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border1 bg-bg1 p-8">
        <div className="text-lg font-bold mb-1 text-text1">
          Dienst<span className="text-accent">Leitstelle</span>
        </div>
        <div className="text-[11px] uppercase tracking-wide text-text3 mb-6">Workforce Management</div>

        {sent ? (
          <div className="rounded-lg border border-green-700 bg-[var(--green-dim)] text-[var(--green)] p-4 text-sm">
            Bestätigungslink wurde an <strong>{email}</strong> geschickt. Klick darauf, dann legen wir dein Unternehmen an.
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-1 text-text1">Unternehmen anlegen</h1>
            <p className="text-text2 text-sm mb-5">14 Tage kostenlos, keine Kreditkarte nötig.</p>

            {error && (
              <div className="rounded-lg border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-3 text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="Vorname"
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 outline-none focus:border-accent text-sm"
                />
                <input
                  required
                  placeholder="Nachname"
                  value={nachname}
                  onChange={(e) => setNachname(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 outline-none focus:border-accent text-sm"
                />
              </div>
              <input
                type="email"
                required
                placeholder="email@firma.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 outline-none focus:border-accent text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-accent text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Sende Link…' : 'Konto erstellen'}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-text3">
              Schon registriert?{' '}
              <a href="/login" className="text-accent hover:underline">
                Anmelden
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
