'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const BUNDESLAENDER = [
  ['BW', 'Baden-Württemberg'], ['BY', 'Bayern'], ['BE', 'Berlin'], ['BB', 'Brandenburg'],
  ['HB', 'Bremen'], ['HH', 'Hamburg'], ['HE', 'Hessen'], ['MV', 'Mecklenburg-Vorpommern'],
  ['NI', 'Niedersachsen'], ['NW', 'Nordrhein-Westfalen'], ['RP', 'Rheinland-Pfalz'],
  ['SL', 'Saarland'], ['SN', 'Sachsen'], ['ST', 'Sachsen-Anhalt'],
  ['SH', 'Schleswig-Holstein'], ['TH', 'Thüringen'],
];

const BRANCHEN = [
  ['standard', 'Allgemein / Mehrere Branchen'],
  ['sicherheit', 'Sicherheitsdienst (12h)'],
  ['gesundheit', 'Pflege / Betreuung (12h)'],
  ['gastro', 'Gastronomie'],
  ['transport', 'Transport / Logistik'],
];

export default function OnboardingPage() {
  const router = useRouter();
  const [firma, setFirma] = useState('');
  const [bundesland, setBundesland] = useState('BW');
  const [branche, setBranche] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('create_tenant_for_user', {
      p_firma: firma,
      p_bundesland: bundesland,
      p_branche: branche,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
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
        <h1 className="text-xl font-semibold mb-1 text-text1 mt-4">Willkommen!</h1>
        <p className="text-text2 text-sm mb-6">
          Lass uns kurz dein Unternehmen einrichten — danach kannst du sofort starten.
        </p>

        {error && (
          <div className="rounded-lg border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-text3 mb-1">Unternehmen</label>
            <input
              required
              autoFocus
              placeholder="z. B. Sicherheitsdienst Mustermann GmbH"
              value={firma}
              onChange={(e) => setFirma(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 outline-none focus:border-accent text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-text3 mb-1">Bundesland (für Feiertage)</label>
            <select
              value={bundesland}
              onChange={(e) => setBundesland(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm"
            >
              {BUNDESLAENDER.map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-text3 mb-1">Branche</label>
            <select
              value={branche}
              onChange={(e) => setBranche(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm"
            >
              {BRANCHEN.map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !firma}
            className="w-full mt-2 py-2.5 rounded-lg bg-accent text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Lege an…' : 'Loslegen'}
          </button>
        </form>
      </div>
    </div>
  );
}
