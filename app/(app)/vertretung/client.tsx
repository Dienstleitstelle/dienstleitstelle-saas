'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function VertretungClient({ initial, kollegen }: { initial: any[]; kollegen: any[] }) {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);

  async function reload() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('vertretungen')
      .select('*, vertreter:vertreter_id(vorname, nachname, email)')
      .eq('vertretene_id', user?.id ?? '')
      .order('von', { ascending: false });
    setList(data ?? []);
  }

  async function del(id: string) {
    if (!confirm('Vertretung löschen?')) return;
    const supabase = createClient();
    await supabase.from('vertretungen').delete().eq('id', id);
    reload();
  }

  const heute = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text1">Meine Vertretungen</h1>
          <p className="text-text3 text-sm mt-1">Wer übernimmt deine Aufgaben, wenn du nicht da bist.</p>
        </div>
        <button onClick={() => setOpen(true)} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold">
          + Vertretung definieren
        </button>
      </div>

      {list.length === 0 ? (
        <div className="bg-bg1 border border-border1 rounded-xl text-text3 text-sm text-center py-8">
          Keine Vertretungen definiert.
        </div>
      ) : (
        <div className="bg-bg1 border border-border1 rounded-xl">
          <ul className="divide-y divide-border1">
            {list.map((v) => {
              const aktiv = v.von <= heute && v.bis >= heute;
              const vergangen = v.bis < heute;
              return (
                <li key={v.id} className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-text1 font-semibold">{v.vertreter?.vorname} {v.vertreter?.nachname}</span>
                      {aktiv && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--green-dim)] text-[var(--green)] font-bold">AKTIV</span>}
                      {vergangen && <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg3 text-text3">vergangen</span>}
                    </div>
                    <div className="text-text2 text-xs mt-1">
                      {new Date(v.von + 'T12:00').toLocaleDateString('de-DE')} – {new Date(v.bis + 'T12:00').toLocaleDateString('de-DE')}
                    </div>
                    {v.notiz && <div className="text-text3 text-xs mt-1">{v.notiz}</div>}
                  </div>
                  {!vergangen && (
                    <button onClick={() => del(v.id)} className="text-xs text-[var(--red)] hover:underline">Löschen</button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {open && <NeuModal kollegen={kollegen} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
    </div>
  );
}

function NeuModal({ kollegen, onClose, onSaved }: { kollegen: any[]; onClose: () => void; onSaved: () => void }) {
  const [vertreterId, setVertreterId] = useState('');
  const [von, setVon] = useState('');
  const [bis, setBis] = useState('');
  const [notiz, setNotiz] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
    const { error } = await supabase.from('vertretungen').insert({
      tenant_id: profile?.tenant_id,
      vertretene_id: user?.id,
      vertreter_id: vertreterId,
      von, bis, notiz: notiz || null,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-base font-bold text-text1 mb-4">Vertretung definieren</h2>
        {error && <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">{error}</div>}
        <div className="space-y-3">
          <label className="block">
            <Label>Vertreter/in</Label>
            <select required value={vertreterId} onChange={(e) => setVertreterId(e.target.value)} className={inputCls}>
              <option value="">— wählen —</option>
              {kollegen.filter((k: any) => k.rolle !== 'mitarbeiter').map((k: any) => (
                <option key={k.id} value={k.id}>{k.vorname} {k.nachname} ({k.rolle})</option>
              ))}
            </select>
            <p className="text-text3 text-[10px] mt-1">Vertreten werden können nur Admins und andere Leitungen.</p>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <Label>Von</Label>
              <input type="date" required value={von} onChange={(e) => setVon(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <Label>Bis</Label>
              <input type="date" required value={bis} onChange={(e) => setBis(e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="block">
            <Label>Notiz (optional)</Label>
            <textarea value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={2} className={inputCls} placeholder="z. B. Was muss übernommen werden?" />
          </label>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Abbrechen</button>
          <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Speichere…' : 'Anlegen'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm outline-none focus:border-accent';
function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">{children}</span>;
}
