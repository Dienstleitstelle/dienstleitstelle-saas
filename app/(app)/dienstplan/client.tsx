'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { pruefeSchicht, DEFAULT_REGELN } from '@/lib/regeln';
import type { Mitarbeiter, Objekt, Einteilung } from '@/lib/supabase/types';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getMonday(off: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow + off * 7);
  return d;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtNice(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function DienstplanClient({ objekte, mitarbeiter }: {
  objekte: Objekt[]; mitarbeiter: Mitarbeiter[];
}) {
  const [wkOff, setWkOff] = useState(0);
  const [einteilungen, setEinteilungen] = useState<Einteilung[]>([]);
  const [modal, setModal] = useState<{ objektId: string; datum: string } | null>(null);

  const monday = useMemo(() => getMonday(wkOff), [wkOff]);
  const dates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    }),
    [monday]
  );

  async function reload() {
    const supabase = createClient();
    const { data } = await supabase
      .from('einteilungen')
      .select('*')
      .gte('datum', fmt(dates[0]))
      .lte('datum', fmt(dates[6]));
    setEinteilungen((data ?? []) as Einteilung[]);
  }

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [wkOff]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setWkOff(wkOff - 1)} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">← Zurück</button>
          <span className="text-sm font-semibold text-text1 px-3">
            KW {getISOWeek(monday)} · {fmtNice(dates[0])} – {fmtNice(dates[6])}
          </span>
          <button onClick={() => setWkOff(wkOff + 1)} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Vor →</button>
          <button onClick={() => setWkOff(0)} className="px-3 py-1.5 rounded-lg border border-accent text-accent text-sm">Heute</button>
        </div>
      </div>

      <div className="bg-bg1 border border-border1 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="grid min-w-[840px]" style={{ gridTemplateColumns: '170px repeat(7, minmax(110px, 1fr))' }}>
            <div className="bg-bg2 px-3 py-2 text-[10px] uppercase font-bold text-text3 border-b border-border1 border-r border-border1">
              Objekt
            </div>
            {dates.map((d) => (
              <div key={fmt(d)} className="bg-bg2 px-3 py-2 text-[10px] uppercase font-bold text-text3 text-center border-b border-border1">
                {DAYS[(d.getDay() + 6) % 7]} <span className="text-text2 ml-1">{fmtNice(d)}</span>
              </div>
            ))}

            {objekte.length === 0 && (
              <div className="col-span-8 text-center text-text3 py-8 text-sm">
                Lege erst Objekte an, um Schichten planen zu können.
              </div>
            )}

            {objekte.map((obj) => (
              <div key={obj.id} className="contents">
                <div className="bg-bg2 px-3 py-2 border-b border-border1 border-r border-border1 flex flex-col justify-center">
                  <div className="text-text1 text-sm font-semibold truncate">{obj.name}</div>
                  <div className="text-text3 text-[10px] truncate">{obj.adresse}</div>
                  <div className="text-text3 text-[10px] font-mono">
                    {obj.von_default?.slice(0, 5)}–{obj.bis_default?.slice(0, 5)}
                  </div>
                </div>
                {dates.map((d) => {
                  const datum = fmt(d);
                  const cellEin = einteilungen.filter((e) => e.objekt_id === obj.id && e.datum === datum);
                  return (
                    <div
                      key={`${obj.id}-${datum}`}
                      onClick={() => setModal({ objektId: obj.id, datum })}
                      className="border-b border-border1 border-r border-border1 p-1 min-h-[64px] cursor-pointer hover:bg-bg3 transition-colors"
                    >
                      {cellEin.map((e) => {
                        const ma = mitarbeiter.find((m) => m.id === e.mitarbeiter_id);
                        return (
                          <div key={e.id} className="rounded bg-[var(--accent-dim)] text-[11px] px-2 py-1 mb-1">
                            <div className="text-accent font-semibold truncate">
                              {ma ? `${ma.vorname} ${ma.nachname}` : '?'}
                            </div>
                            <div className="text-accent/70 text-[10px] font-mono">
                              {e.von?.slice(0, 5)}–{e.bis?.slice(0, 5)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <EinteilenModal
          objektId={modal.objektId}
          datum={modal.datum}
          objekt={objekte.find((o) => o.id === modal.objektId)!}
          mitarbeiter={mitarbeiter}
          alleEinteilungen={einteilungen}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); reload(); }}
        />
      )}
    </div>
  );
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function EinteilenModal({ objektId, datum, objekt, mitarbeiter, alleEinteilungen, onClose, onSaved }: {
  objektId: string; datum: string; objekt: Objekt; mitarbeiter: Mitarbeiter[];
  alleEinteilungen: Einteilung[]; onClose: () => void; onSaved: () => void;
}) {
  const [maId, setMaId] = useState(mitarbeiter[0]?.id ?? '');
  const [von, setVon] = useState(objekt.von_default?.slice(0, 5) ?? '08:00');
  const [bis, setBis] = useState(objekt.bis_default?.slice(0, 5) ?? '17:00');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Live-Pruefung gegen die hinterlegten Regeln (vorerst Defaults).
  // Phase 1 wird die Regeln pro Berufsgruppe aus der DB laden.
  const pruefung = useMemo(() => {
    if (!maId) return { ok: true, hinweise: [], sperren: [] };
    return pruefeSchicht(
      {
        schicht: { von, bis, datum },
        andereEinteilungen: alleEinteilungen
          .filter((e) => e.mitarbeiter_id === maId)
          .map((e) => ({ datum: e.datum, von: e.von, bis: e.bis })),
      },
      DEFAULT_REGELN
    );
  }, [maId, von, bis, datum, alleEinteilungen]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!pruefung.ok) return;
    setError(null); setLoading(true);
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
    const { error } = await supabase.from('einteilungen').insert({
      tenant_id: profile?.tenant_id,
      objekt_id: objektId,
      mitarbeiter_id: maId,
      datum, von, bis,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-base font-bold text-text1">Schicht eintragen</h2>
        <p className="text-text3 text-xs mb-4">{objekt.name} · {new Date(datum + 'T12:00').toLocaleDateString('de-DE')}</p>

        <div className="space-y-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Mitarbeiter</span>
            <select value={maId} onChange={(e) => setMaId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm">
              {mitarbeiter.map((m) => (
                <option key={m.id} value={m.id}>{m.vorname} {m.nachname} ({m.vertrag})</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Von</span>
              <input type="time" value={von} onChange={(e) => setVon(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm" />
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Bis</span>
              <input type="time" value={bis} onChange={(e) => setBis(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm" />
            </label>
          </div>
        </div>

        {pruefung.hinweise.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-700 bg-[var(--amber-dim)] text-[var(--amber)] p-3 text-xs">
            <div className="font-bold mb-1">Hinweis</div>
            {pruefung.hinweise.map((w, i) => <div key={i}>• {w}</div>)}
          </div>
        )}
        {pruefung.sperren.length > 0 && (
          <div className="mt-3 rounded-lg border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-3 text-xs">
            <div className="font-bold mb-1">Regelverstoß</div>
            {pruefung.sperren.map((b, i) => <div key={i}>• {b}</div>)}
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-lg border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">
            Abbrechen
          </button>
          <button type="submit" disabled={!pruefung.ok || loading}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-40">
            {loading ? 'Speichere…' : 'Eintragen'}
          </button>
        </div>
      </form>
    </div>
  );
}
