'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Mitarbeiter, Vertrag, Gruppe } from '@/lib/supabase/types';

const VERTRAG_BADGE: Record<Vertrag, string> = {
  Vollzeit: 'bg-[var(--accent-dim2)] text-accent',
  Teilzeit: 'bg-[var(--green-dim)] text-[var(--green)]',
  Minijob:  'bg-[var(--amber-dim)] text-[var(--amber)]',
  Aushilfe: 'bg-bg3 text-text2',
};

const GRUPPE_LABEL: Record<Gruppe, string> = {
  standard: 'Allgemein',
  betreuer: 'Betreuung',
  paedagoge: 'Pädagogik',
  sicherheit: 'Sicherheit',
  pflege: 'Pflege',
  transport: 'Fahrer',
};

export function MitarbeiterClient({ initial }: { initial: Mitarbeiter[] }) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);

  async function reload() {
    const supabase = createClient();
    const { data } = await supabase.from('mitarbeiter').select('*').order('nachname');
    setList(data ?? []);
  }

  async function del(id: string) {
    if (!confirm('Mitarbeiter wirklich löschen?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('mitarbeiter').delete().eq('id', id);
    if (error) alert(error.message);
    else reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text1">Mitarbeiter</h1>
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90"
        >
          + Mitarbeiter
        </button>
      </div>

      <div className="bg-bg1 border border-border1 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg2">
              <tr className="text-text3 text-[10px] uppercase">
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Position</th>
                <th className="text-left px-3 py-2">Gruppe</th>
                <th className="text-left px-3 py-2">Vertrag</th>
                <th className="text-right px-3 py-2">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={5} className="text-center text-text3 py-6 text-sm">Noch keine Mitarbeiter angelegt.</td></tr>
              )}
              {list.map((m) => (
                <tr key={m.id} className="border-t border-border1 hover:bg-bg2">
                  <td className="px-3 py-2 text-text1 font-medium">
                    {m.vorname} {m.nachname}
                    {m.email && <div className="text-[10px] text-text3">{m.email}</div>}
                  </td>
                  <td className="px-3 py-2 text-text2">{m.position ?? '–'}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-bg3 text-text2">
                      {GRUPPE_LABEL[m.gruppe]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${VERTRAG_BADGE[m.vertrag]}`}>
                      {m.vertrag}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => del(m.id)}
                      className="text-xs text-[var(--red)] hover:underline"
                    >
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
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [vertrag, setVertrag] = useState<Vertrag>('Vollzeit');
  const [gruppe, setGruppe] = useState<Gruppe>('standard');
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

    const { error } = await supabase.from('mitarbeiter').insert({
      tenant_id: profile?.tenant_id,
      vorname, nachname, email: email || null, position: position || null, vertrag, gruppe,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-base font-bold text-text1 mb-4">Neuer Mitarbeiter</h2>
        {error && (
          <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input label="Vorname" value={vorname} onChange={setVorname} required />
            <Input label="Nachname" value={nachname} onChange={setNachname} required />
          </div>
          <Input label="E-Mail (optional)" value={email} onChange={setEmail} type="email" />
          <Input label="Position" value={position} onChange={setPosition} />
          <div className="grid grid-cols-2 gap-2">
            <Select label="Vertrag" value={vertrag} onChange={(v) => setVertrag(v as Vertrag)}
              options={['Vollzeit','Teilzeit','Minijob','Aushilfe']} />
            <Select label="Gruppe" value={gruppe} onChange={(v) => setGruppe(v as Gruppe)}
              options={['standard','betreuer','paedagoge','sicherheit','pflege','transport']} />
          </div>
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

function Input({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">{label}</span>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm outline-none focus:border-accent" />
    </label>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
