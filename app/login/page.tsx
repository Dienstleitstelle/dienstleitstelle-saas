'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Login fehlgeschlagen: ' + error.message);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg0 p-4">
      <div className="w-full max-w-md rounded-xl border border-border1 bg-bg1 p-8">
        <div className="text-lg font-bold mb-1 text-text1">
          Dienst<span className="text-accent">Leitstelle</span>
        </div>
        <h1 className="text-xl font-semibold mb-6 text-text1">Anmelden</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">E-Mail</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm outline-none focus:border-accent" />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Passwort</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm outline-none focus:border-accent" />
          </label>

          {error && <div className="rounded-lg border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-3 text-sm">{error}</div>}

          <button type="submit" disabled={loading || !email || !password}
            className="w-full py-2.5 rounded-lg bg-accent text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50">
            {loading ? 'Melde an...' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-border1 text-center text-text3 text-xs space-y-1">
          <p>Du hast noch keinen Account? <a href="/signup" className="text-accent">Firma anlegen</a></p>
          <p>Mitarbeiter erhalten Zugangsdaten von ihrem Admin.</p>
        </div>
      </div>
    </div>
  );
}
