'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { vorname, nachname } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (!data.session) {
      setError('Kein Session-Token erhalten. Pruefe deine E-Mail-Bestaetigung in Supabase Auth.');
      return;
    }
    router.push('/onboarding');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg0 p-4">
      <div className="w-full max-w-md rounded-xl border border-border1 bg-bg1 p-8">
        <div className="text-lg font-bold mb-1 text-text1">
          Dienst<span className="text-accent">Leitstelle</span>
        </div>
        <h1 className="text-xl font-semibold mb-1 text-text1">Firma anlegen</h1>
        <p className="text-text3 text-xs mb-5">Du wirst Admin deines Unternehmens.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Vorname</span>
              <input required value={vorname} onChange={(e) => setVorname(e.target.value)}
                className={inp} />
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Nachname</span>
              <input required value={nachname} onChange={(e) => setNachname(e.target.value)}
                className={inp} />
            </label>
          </div>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">E-Mail</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className={inp} />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Passwort (mind. 8 Zeichen)</span>
            <input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)}
              className={inp} />
          </label>

          {error && <div className="rounded-lg border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-3 text-sm">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-accent text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50">
            {loading ? 'Lege an...' : 'Konto anlegen'}
          </button>
        </form>

        <p className="mt-5 text-center text-text3 text-xs">
          Schon Mitarbeiter? <a href="/login" className="text-accent">Hier einloggen</a>
        </p>
      </div>
    </div>
  );
}

const inp = 'w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm outline-none focus:border-accent';
