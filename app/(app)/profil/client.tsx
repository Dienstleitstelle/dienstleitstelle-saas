'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function ProfilClient({ profile, email }: { profile: any; email: string }) {
  const router = useRouter();
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function aendern(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMsg(null);
    if (pw1.length < 8) { setError('Mindestens 8 Zeichen.'); return; }
    if (pw1 !== pw2) { setError('Passwoerter stimmen nicht ueberein.'); return; }
    setLoading(true);
    const res = await fetch('/api/profile/passwort', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw1 }),
    });
    const j = await res.json();
    setLoading(false);
    if (!res.ok) { setError(j?.error ?? 'Fehler'); return; }
    setMsg('Passwort aktualisiert.');
    setPw1(''); setPw2('');
  }

  async function abmelden() {
    const sup = createClient();
    await sup.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="text-xl font-bold text-text1">Mein Profil</h1>
        <p className="text-text3 text-sm mt-1">{profile?.vorname} {profile?.nachname} - {email} - Rolle: {profile?.rolle}</p>
      </div>

      <form onSubmit={aendern} className="bg-bg1 border border-border1 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text1">Passwort aendern</h2>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Neues Passwort (mind. 8 Zeichen)</span>
          <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} className={inp} />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Wiederholen</span>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inp} />
        </label>
        {error && <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs">{error}</div>}
        {msg && <div className="rounded border border-green-700 bg-[var(--green-dim)] text-[var(--green)] p-2 text-xs">{msg}</div>}
        <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
          {loading ? 'Speichere...' : 'Passwort aendern'}
        </button>
      </form>

      <div className="bg-bg1 border border-border1 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-text1 mb-2">Sitzung</h2>
        <button onClick={abmelden} className="text-xs px-3 py-1.5 rounded-lg border border-red-700 text-[var(--red)] hover:bg-[var(--red-dim)]">
          Abmelden
        </button>
      </div>
    </div>
  );
}

const inp = 'w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm outline-none focus:border-accent';
