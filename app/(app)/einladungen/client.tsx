'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Rolle } from '@/lib/supabase/types';

interface Einladung {
  id: string;
  email: string;
  rolle: Rolle;
  vorname: string | null;
  nachname: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export function EinladungenClient({ initial }: { initial: Einladung[] }) {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);

  async function reload() {
    const supabase = createClient();
    const { data } = await supabase.from('invitations').select('*').order('created_at', { ascending: false });
    setList((data ?? []) as Einladung[]);
  }

  async function widerrufen(id: string) {
    if (!confirm('Einladung widerrufen?')) return;
    const supabase = createClient();
    await supabase.from('invitations').delete().eq('id', id);
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text1">Team einladen</h1>
        <button onClick={() => setOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90">
          + Einladung
        </button>
      </div>

      <div className="bg-bg1 border border-border1 rounded-xl p-4">
        {list.length === 0 ? (
          <div className="text-text3 text-sm text-center py-6">Noch keine Einladungen versendet.</div>
        ) : (
          <ul className="divide-y divide-border1">
            {list.map((e) => {
              const status = e.accepted_at
                ? 'Angenommen'
                : new Date(e.expires_at) < new Date()
                ? 'Abgelaufen'
                : 'Offen';
              const statusColor = e.accepted_at
                ? 'text-[var(--green)]'
                : status === 'Abgelaufen'
                ? 'text-[var(--red)]'
                : 'text-[var(--amber)]';
              const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${e.token}`;
              return (
                <li key={e.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-text1 text-sm font-medium truncate">
                      {e.vorname} {e.nachname} <span className="text-text3 font-normal">— {e.email}</span>
                    </div>
                    <div className="text-text3 text-xs flex gap-2 flex-wrap mt-0.5">
                      <span className="capitalize">Rolle: {e.rolle}</span>
                      <span className={statusColor}>{status}</span>
                      {!e.accepted_at && (
                        <button
                          onClick={() => navigator.clipboard.writeText(link)}
                          className="text-accent hover:underline"
                          title={link}
                        >
                          Link kopieren
                        </button>
                      )}
                    </div>
                  </div>
                  {!e.accepted_at && (
                    <button onClick={() => widerrufen(e.id)}
                      className="text-xs text-[var(--red)] hover:underline">
                      Widerrufen
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {open && <NewModal onClose={() => setOpen(false)} onSaved={reload} />}
    </div>
  );
}

function NewModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState('');
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [rolle, setRolle] = useState<Rolle>('mitarbeiter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const supabase = createClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, id')
      .single();

    const { error } = await supabase.from('invitations').insert({
      tenant_id: profile?.tenant_id,
      email,
      rolle,
      vorname: vorname || null,
      nachname: nachname || null,
      invited_by: profile?.id,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-base font-bold text-text1 mb-4">Person einladen</h2>
        {error && (
          <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input label="Vorname" value={vorname} onChange={setVorname} />
            <Input label="Nachname" value={nachname} onChange={setNachname} />
          </div>
          <Input label="E-Mail" value={email} onChange={setEmail} type="email" required />
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Rolle</span>
            <select value={rolle} onChange={(e) => setRolle(e.target.value as Rolle)}
              className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm">
              <option value="mitarbeiter">Mitarbeiter</option>
              <option value="leitung">Leitung</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-text3 mt-3">
          Nach dem Anlegen bekommst du den Einladungslink. Du kannst ihn per E-Mail oder WhatsApp verschicken.
        </p>
        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">
            Abbrechen
          </button>
          <button type="submit" disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Sende…' : 'Einladen'}
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
