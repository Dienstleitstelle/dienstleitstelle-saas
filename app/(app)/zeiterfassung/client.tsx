'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const minsAusZeit = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const dauerH = (von: string, bis: string, pause: number = 0) => {
  let d = minsAusZeit(bis) - minsAusZeit(von);
  if (d < 0) d += 1440;
  return Math.max(0, (d - pause) / 60);
};

export function ZeiterfassungClient({ initial, mitarbeiter, objekte, rolle, meineMaId }: {
  initial: any[]; mitarbeiter: any[]; objekte: any[];
  rolle: 'admin' | 'leitung' | 'mitarbeiter'; meineMaId: string | null;
}) {
  const [list, setList] = useState(initial);
  const [neu, setNeu] = useState(false);
  const [maFilter, setMaFilter] = useState<string>(rolle === 'mitarbeiter' && meineMaId ? meineMaId : '');
  const [vonFilter, setVonFilter] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [bisFilter, setBisFilter] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10));

  const canCreate = rolle === 'admin' || rolle === 'leitung' || meineMaId != null;
  const canSeeAll = rolle === 'admin' || rolle === 'leitung';

  async function reload() {
    const supabase = createClient();
    let q = supabase.from('zeiten')
      .select('*, mitarbeiter:mitarbeiter_id(vorname, nachname), objekt:objekt_id(name)')
      .gte('datum', vonFilter)
      .lte('datum', bisFilter)
      .order('datum', { ascending: false }).order('von', { ascending: false });
    if (maFilter) q = q.eq('mitarbeiter_id', maFilter);
    const { data } = await q;
    setList(data ?? []);
  }

  async function del(id: string) {
    if (!confirm('Eintrag löschen?')) return;
    const supabase = createClient();
    await supabase.from('zeiten').delete().eq('id', id);
    reload();
  }

  const summe = useMemo(() => {
    return list.reduce((s, z) => s + dauerH(z.von, z.bis, z.pause_min || 0), 0);
  }, [list]);

  function exportCSV() {
    // DATEV-LODAS-aehnliches Format: MA-Nr;Vor;Nach;Datum;Std
    const lines = ['Mitarbeiter;Vorname;Nachname;Datum;Von;Bis;Pause(min);Stunden;Objekt;Notiz'];
    for (const z of list) {
      const std = dauerH(z.von, z.bis, z.pause_min || 0).toFixed(2).replace('.', ',');
      lines.push([
        z.mitarbeiter_id,
        z.mitarbeiter?.vorname ?? '',
        z.mitarbeiter?.nachname ?? '',
        z.datum,
        z.von.slice(0, 5),
        z.bis.slice(0, 5),
        z.pause_min || 0,
        std,
        (z.objekt?.name ?? '').replace(/;/g, ','),
        (z.notiz ?? '').replace(/;/g, ',').replace(/\n/g, ' '),
      ].join(';'));
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stunden_${vonFilter}_${bisFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-text1">Zeiterfassung</h1>
          <p className="text-text3 text-sm mt-1">Stundennachweis je Mitarbeiter und Zeitraum.</p>
        </div>
        <div className="flex gap-2">
          {canSeeAll && (
            <button onClick={exportCSV} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm hover:text-text1">
              ⬇ CSV-Export
            </button>
          )}
          {canCreate && (
            <button onClick={() => setNeu(true)} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold">+ Eintrag</button>
          )}
        </div>
      </div>

      <div className="bg-bg1 border border-border1 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
        {canSeeAll && (
          <label className="block">
            <Label>Mitarbeiter</Label>
            <select value={maFilter} onChange={(e) => setMaFilter(e.target.value)} className={inputCls}>
              <option value="">— alle —</option>
              {mitarbeiter.map((m: any) => <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <Label>Von</Label>
          <input type="date" value={vonFilter} onChange={(e) => setVonFilter(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <Label>Bis</Label>
          <input type="date" value={bisFilter} onChange={(e) => setBisFilter(e.target.value)} className={inputCls} />
        </label>
        <button onClick={reload} className="px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm">Filtern</button>
      </div>

      <div className="bg-bg1 border border-border1 rounded-xl overflow-hidden">
        {list.length === 0 ? (
          <div className="text-text3 text-sm text-center py-8">Keine Einträge im Zeitraum.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg2 text-text3 text-[10px] uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Datum</th>
                    <th className="text-left px-3 py-2">Mitarbeiter</th>
                    <th className="text-left px-3 py-2">Von – Bis</th>
                    <th className="text-right px-3 py-2">Pause</th>
                    <th className="text-right px-3 py-2">Std.</th>
                    <th className="text-left px-3 py-2">Objekt</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((z) => (
                    <tr key={z.id} className="border-t border-border1 hover:bg-bg2">
                      <td className="px-3 py-2 text-text2">{new Date(z.datum + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                      <td className="px-3 py-2 text-text1">{z.mitarbeiter?.vorname} {z.mitarbeiter?.nachname}</td>
                      <td className="px-3 py-2 text-text2 font-mono text-xs">{z.von.slice(0, 5)}–{z.bis.slice(0, 5)}</td>
                      <td className="px-3 py-2 text-text3 text-right">{z.pause_min || 0} min</td>
                      <td className="px-3 py-2 text-text1 text-right font-semibold">{dauerH(z.von, z.bis, z.pause_min || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-text2 text-xs">{z.objekt?.name ?? '–'}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => del(z.id)} className="text-xs text-[var(--red)]">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border2 bg-bg2">
                    <td colSpan={4} className="px-3 py-2 text-right text-text2 text-xs uppercase">Summe</td>
                    <td className="px-3 py-2 text-right text-text1 font-bold">{summe.toFixed(2)} h</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {neu && (
        <NeuModal mitarbeiter={mitarbeiter} objekte={objekte}
          standardMaId={rolle === 'mitarbeiter' ? meineMaId : null}
          onClose={() => setNeu(false)} onSaved={() => { setNeu(false); reload(); }} />
      )}
    </div>
  );
}

function NeuModal({ mitarbeiter, objekte, standardMaId, onClose, onSaved }: {
  mitarbeiter: any[]; objekte: any[]; standardMaId: string | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [maId, setMaId] = useState(standardMaId ?? '');
  const [objektId, setObjektId] = useState('');
  const [von, setVon] = useState('08:00');
  const [bis, setBis] = useState('17:00');
  const [pause, setPause] = useState('30');
  const [notiz, setNotiz] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    if (!maId) { setError('Bitte Mitarbeiter wählen.'); setLoading(false); return; }
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
    const { error } = await supabase.from('zeiten').insert({
      tenant_id: profile?.tenant_id,
      mitarbeiter_id: maId,
      objekt_id: objektId || null,
      datum, von, bis,
      pause_min: Number(pause) || 0,
      notiz: notiz || null,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-base font-bold text-text1 mb-4">Zeit erfassen</h2>
        {error && <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">{error}</div>}
        <div className="space-y-3">
          {!standardMaId && (
            <label className="block">
              <Label>Mitarbeiter</Label>
              <select required value={maId} onChange={(e) => setMaId(e.target.value)} className={inputCls}>
                <option value="">— wählen —</option>
                {mitarbeiter.map((m: any) => <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>)}
              </select>
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <Label>Datum</Label>
              <input type="date" required value={datum} onChange={(e) => setDatum(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <Label>Objekt</Label>
              <select value={objektId} onChange={(e) => setObjektId(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {objekte.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <Label>Von</Label>
              <input type="time" required value={von} onChange={(e) => setVon(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <Label>Bis</Label>
              <input type="time" required value={bis} onChange={(e) => setBis(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <Label>Pause (min)</Label>
              <input type="number" min={0} value={pause} onChange={(e) => setPause(e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="block">
            <Label>Notiz</Label>
            <textarea rows={2} value={notiz} onChange={(e) => setNotiz(e.target.value)} className={inputCls} />
          </label>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Abbrechen</button>
          <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Speichere…' : 'Erfassen'}
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
