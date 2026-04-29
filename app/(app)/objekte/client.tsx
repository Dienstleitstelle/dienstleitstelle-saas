'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Objekt, Branche } from '@/lib/supabase/types';

const BRANCHE_LABEL: Record<Branche, string> = {
  standard: 'Standard (10h)',
  sicherheit: 'Sicherheit (12h)',
  gesundheit: 'Gesundheit (12h)',
  transport: 'Transport (10h)',
  gastro: 'Gastronomie (10h)',
};

export function ObjekteClient({ initial }: { initial: Objekt[] }) {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);

  async function reload() {
    const supabase = createClient();
    const { data } = await supabase.from('objekte').select('*').order('name');
    setList(data ?? []);
  }

  async function del(id: string) {
    if (!confirm('Objekt wirklich löschen? Alle zugehörigen Schichten/Berichte gehen ebenfalls verloren.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('objekte').delete().eq('id', id);
    if (error) alert(error.message);
    else reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text1">Objekte</h1>
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90"
        >
          + Objekt
        </button>
      </div>

      <div className="bg-bg1 border border-border1 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg2">
              <tr className="text-text3 text-[10px] uppercase">
                <th className="text-left px-3 py-2">Objekt</th>
                <th className="text-left px-3 py-2">Adresse</th>
                <th className="text-left px-3 py-2">Standardzeit</th>
                <th className="text-left px-3 py-2">Branche</th>
                <th className="text-right px-3 py-2">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={5} className="text-center text-text3 py-6 text-sm">Noch keine Objekte angelegt.</td></tr>
              )}
              {list.map((o) => (
                <tr key={o.id} className="border-t border-border1 hover:bg-bg2">
                  <td className="px-3 py-2 text-text1 font-medium">{o.name}</td>
                  <td className="px-3 py-2 text-text2 text-xs">{o.adresse ?? '–'}</td>
                  <td className="px-3 py-2 font-mono text-accent text-xs">
                    {o.von_default?.slice(0, 5)} – {o.bis_default?.slice(0, 5)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-bg3 text-text2">
                      {BRANCHE_LABEL[o.branche]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => del(o.id)} className="text-xs text-[var(--red)] hover:underline">
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && <NewModal onClose={() => setOpen(false)} onSaved={reload} />}
    </div>
  );
}

function NewModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [adresse, setAdresse] = useState('');
  const [von, setVon] = useState('08:00');
  const [bis, setBis] = useState('17:00');
  const [branche, setBranche] = useState<Branche>('standard');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const supabase = createClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .single();

    const { error } = await supabase.from('objekte').insert({
      tenant_id: profile?.tenant_id,
      name, adresse: adresse || null, von_default: von, bis_default: bis, branche,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-base font-bold text-text1 mb-4">Neues Objekt</h2>
        {error && (
          <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <Input label="Name" value={name} onChange={setName} required />
          <Input label="Adresse" value={adresse} onChange={setAdresse} />
          <div className="grid grid-cols-2 gap-2">
            <TimeInput label="Standard von" value={von} onChange={setVon} />
            <TimeInput label="Standard bis" value={bis} onChange={setBis} />
          </div>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Branche</span>
            <select value={branche} onChange={(e) => setBranche(e.target.value as Branche)}
              className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm">
              <option value="standard">Standard (10h max.)</option>
              <option value="sicherheit">Sicherheit (12h möglich)</option>
              <option value="gesundheit">Gesundheit/Pflege (12h möglich)</option>
              <option value="transport">Transport</option>
              <option value="gastro">Gastronomie</option>
            </select>
          </label>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">
            Abbrechen
          </button>
          <button type="submit" disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Speichere…' : 'Anlegen'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, required }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm outline-none focus:border-accent" />
    </label>
  );
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">{label}</span>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm outline-none focus:border-accent" />
    </label>
  );
}
