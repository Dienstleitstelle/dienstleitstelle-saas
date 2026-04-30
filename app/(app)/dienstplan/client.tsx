'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { pruefeSchicht, DEFAULT_REGELN, type Regelwerk } from '@/lib/regeln';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface MA {
  id: string; vorname: string; nachname: string; vertrag: string;
  berufsgruppe_id: string | null;
}
interface Objekt {
  id: string; name: string; adresse: string | null;
  von_default: string | null; bis_default: string | null;
}
interface Berufsgruppe { id: string; name: string; regelwerk: Regelwerk; }
interface Einteilung {
  id: string; objekt_id: string; mitarbeiter_id: string;
  datum: string; von: string; bis: string;
}
interface Urlaub {
  id: string; mitarbeiter_id: string; von: string; bis: string;
  typ: string; status: string;
}

function getMonday(off: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow + off * 7);
  return d;
}
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const fmtNice = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function DienstplanClient({ objekte, mitarbeiter, berufsgruppen, rolle }: {
  objekte: Objekt[]; mitarbeiter: MA[]; berufsgruppen: Berufsgruppe[];
  rolle: 'admin' | 'leitung' | 'mitarbeiter';
}) {
  const [wkOff, setWkOff] = useState(0);
  const [einteilungen, setEinteilungen] = useState<Einteilung[]>([]);
  const [urlaube, setUrlaube] = useState<Urlaub[]>([]);
  const [modal, setModal] = useState<{ objektId: string; datum: string } | null>(null);

  const monday = useMemo(() => getMonday(wkOff), [wkOff]);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  }), [monday]);

  const canEdit = rolle === 'admin' || rolle === 'leitung';
  const bgMap = useMemo(() => Object.fromEntries(berufsgruppen.map(b => [b.id, b])), [berufsgruppen]);

  async function reload() {
    const supabase = createClient();
    const [{ data: ein }, { data: url }] = await Promise.all([
      supabase.from('einteilungen').select('*').gte('datum', fmt(dates[0])).lte('datum', fmt(dates[6])),
      supabase.from('urlaube').select('id, mitarbeiter_id, von, bis, typ, status').in('status', ['offen', 'genehmigt']),
    ]);
    setEinteilungen((ein ?? []) as Einteilung[]);
    setUrlaube((url ?? []) as Urlaub[]);
  }

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [wkOff]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setWkOff(wkOff - 1)} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Zurueck</button>
          <span className="text-sm font-semibold text-text1 px-3">
            KW {getISOWeek(monday)} - {fmtNice(dates[0])} bis {fmtNice(dates[6])}
          </span>
          <button onClick={() => setWkOff(wkOff + 1)} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Vor</button>
          <button onClick={() => setWkOff(0)} className="px-3 py-1.5 rounded-lg border border-accent text-accent text-sm">Heute</button>
        </div>
        <span className="text-text3 text-xs">
          {canEdit ? 'Auf eine Zelle klicken zum Einteilen.' : 'Nur Lesezugriff.'}
        </span>
      </div>

      <div className="bg-bg1 border border-border1 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="grid min-w-[840px]" style={{ gridTemplateColumns: '170px repeat(7, minmax(110px, 1fr))' }}>
            <div className="bg-bg2 px-3 py-2 text-[10px] uppercase font-bold text-text3 border-b border-border1 border-r border-border1">Objekt</div>
            {dates.map((d) => (
              <div key={fmt(d)} className="bg-bg2 px-3 py-2 text-[10px] uppercase font-bold text-text3 text-center border-b border-border1">
                {DAYS[(d.getDay() + 6) % 7]} <span className="text-text2 ml-1">{fmtNice(d)}</span>
              </div>
            ))}

            {objekte.length === 0 && (
              <div className="col-span-8 text-center text-text3 py-8 text-sm">
                Lege erst Objekte an, um Schichten planen zu koennen.
              </div>
            )}

            {objekte.map((obj) => (
              <div key={obj.id} className="contents">
                <div className="bg-bg2 px-3 py-2 border-b border-border1 border-r border-border1 flex flex-col justify-center">
                  <div className="text-text1 text-sm font-semibold truncate">{obj.name}</div>
                  <div className="text-text3 text-[10px] truncate">{obj.adresse}</div>
                  <div className="text-text3 text-[10px] font-mono">
                    {obj.von_default?.slice(0, 5)}-{obj.bis_default?.slice(0, 5)}
                  </div>
                </div>
                {dates.map((d) => {
                  const datum = fmt(d);
                  const cellEin = einteilungen.filter((e) => e.objekt_id === obj.id && e.datum === datum);
                  return (
                    <div
                      key={`${obj.id}-${datum}`}
                      onClick={() => canEdit && setModal({ objektId: obj.id, datum })}
                      className={`border-b border-border1 border-r border-border1 p-1 min-h-[64px] transition-colors ${canEdit ? 'cursor-pointer hover:bg-bg3' : ''}`}
                    >
                      {cellEin.map((e) => {
                        const ma = mitarbeiter.find((m) => m.id === e.mitarbeiter_id);
                        return (
                          <div key={e.id} className="rounded bg-[var(--accent-dim)] text-[11px] px-2 py-1 mb-1">
                            <div className="text-accent font-semibold truncate">
                              {ma ? `${ma.vorname} ${ma.nachname}` : '?'}
                            </div>
                            <div className="text-accent/70 text-[10px] font-mono">
                              {e.von?.slice(0, 5)}-{e.bis?.slice(0, 5)}
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
        <EinteilenSidebar
          objektId={modal.objektId} datum={modal.datum}
          objekt={objekte.find((o) => o.id === modal.objektId)!}
          mitarbeiter={mitarbeiter} bgMap={bgMap}
          alleEinteilungen={einteilungen} urlaube={urlaube}
          onClose={() => setModal(null)} onSaved={() => reload()}
        />
      )}
    </div>
  );
}

function EinteilenSidebar({ objektId, datum, objekt, mitarbeiter, bgMap, alleEinteilungen, urlaube, onClose, onSaved }: {
  objektId: string; datum: string; objekt: Objekt; mitarbeiter: MA[];
  bgMap: Record<string, Berufsgruppe>; alleEinteilungen: Einteilung[]; urlaube: Urlaub[];
  onClose: () => void; onSaved: () => void;
}) {
  const [von, setVon] = useState(objekt.von_default?.slice(0, 5) ?? '08:00');
  const [bis, setBis] = useState(objekt.bis_default?.slice(0, 5) ?? '17:00');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bereits = alleEinteilungen.filter(e => e.objekt_id === objektId && e.datum === datum);

  const maStatus = mitarbeiter.map((ma) => {
    const ownEintrag = bereits.find(e => e.mitarbeiter_id === ma.id);
    if (ownEintrag) {
      return { ma, status: 'eingeteilt' as const, info: `${ownEintrag.von.slice(0, 5)}-${ownEintrag.bis.slice(0, 5)}`, eintragId: ownEintrag.id };
    }
    const ur = urlaube.find(u =>
      u.mitarbeiter_id === ma.id && datum >= u.von && datum <= u.bis
    );
    if (ur) {
      const typLabel: Record<string, string> = {
        urlaub: 'Urlaub', krank: 'Krank', fza: 'Freizeitausgleich',
        sonderurlaub: 'Sonderurlaub', unbezahlt: 'Unbezahlt frei',
        eltern: 'Elternzeit', fortbildung: 'Fortbildung', sonstiges: 'Abwesend',
      };
      return { ma, status: 'abwesend' as const, info: typLabel[ur.typ] ?? 'Abwesend' };
    }
    const anderesObj = alleEinteilungen.find(e =>
      e.mitarbeiter_id === ma.id && e.datum === datum && e.objekt_id !== objektId
    );
    const regeln = (ma.berufsgruppe_id && bgMap[ma.berufsgruppe_id]?.regelwerk) || DEFAULT_REGELN;
    const andere = alleEinteilungen
      .filter(e => e.mitarbeiter_id === ma.id)
      .map(e => ({ datum: e.datum, von: e.von, bis: e.bis }));
    const pruefung = pruefeSchicht({ schicht: { von, bis, datum }, andereEinteilungen: andere }, regeln);

    if (anderesObj) {
      return { ma, status: 'konflikt' as const, info: `Bereits in anderem Objekt (${anderesObj.von.slice(0, 5)}-${anderesObj.bis.slice(0, 5)})` };
    }
    if (pruefung.sperren.length > 0) {
      return { ma, status: 'regel-sperre' as const, info: pruefung.sperren[0] };
    }
    if (pruefung.hinweise.length > 0) {
      return { ma, status: 'verfuegbar-warn' as const, info: pruefung.hinweise[0] };
    }
    return { ma, status: 'verfuegbar' as const, info: '' };
  });

  const gefiltert = maStatus.filter(s => {
    if (!filter) return true;
    return `${s.ma.vorname} ${s.ma.nachname}`.toLowerCase().includes(filter.toLowerCase());
  });

  const sortRank: Record<string, number> = {
    'verfuegbar': 0, 'verfuegbar-warn': 1, 'konflikt': 2, 'regel-sperre': 3, 'abwesend': 4, 'eingeteilt': 5,
  };
  gefiltert.sort((a, b) => {
    const r = sortRank[a.status] - sortRank[b.status];
    if (r !== 0) return r;
    return a.ma.nachname.localeCompare(b.ma.nachname);
  });

  async function einplanen(maId: string) {
    setBusy(maId); setError(null);
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
    const { error } = await supabase.from('einteilungen').insert({
      tenant_id: profile?.tenant_id, objekt_id: objektId, mitarbeiter_id: maId, datum, von, bis,
    });
    setBusy(null);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  async function ausplanen(eintragId: string) {
    if (!confirm('Aus Schicht ausplanen?')) return;
    setBusy(eintragId);
    const supabase = createClient();
    const { error } = await supabase.from('einteilungen').delete().eq('id', eintragId);
    setBusy(null);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-stretch justify-end" onClick={onClose}>
      <div className="bg-bg1 border-l border-border2 w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border1">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-text1">{objekt.name}</h2>
              <p className="text-text3 text-xs">{new Date(datum + 'T12:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
            </div>
            <button onClick={onClose} className="text-text3 hover:text-text1 text-xl leading-none px-2">x</button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Von</span>
              <input type="time" value={von} onChange={(e) => setVon(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm" />
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">Bis</span>
              <input type="time" value={bis} onChange={(e) => setBis(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm" />
            </label>
          </div>

          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Mitarbeiter suchen..."
            className="mt-2 w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm" />

          {error && <div className="mt-2 rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs">{error}</div>}
          <p className="text-text3 text-[10px] mt-2">
            Gruen = einplanbar, Gelb = mit Hinweis, Rot = blockiert, Blau = bereits eingeteilt
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {gefiltert.length === 0 && <div className="text-center text-text3 text-sm py-6">Kein Mitarbeiter gefunden.</div>}
          {gefiltert.map(({ ma, status, info, eintragId }: any) => {
            const farbe =
              status === 'verfuegbar' ? 'border-green-700 bg-[var(--green-dim)] hover:bg-green-900/40' :
              status === 'verfuegbar-warn' ? 'border-amber-700 bg-[var(--amber-dim)] hover:bg-amber-900/40' :
              status === 'eingeteilt' ? 'border-accent bg-[var(--accent-dim)]' :
              status === 'konflikt' ? 'border-red-700 bg-[var(--red-dim)] opacity-80' :
              status === 'regel-sperre' ? 'border-red-700 bg-[var(--red-dim)] opacity-80' :
              'border-border2 bg-bg2 opacity-60';
            const klickbar = status === 'verfuegbar' || status === 'verfuegbar-warn';
            const istAusplanbar = status === 'eingeteilt' && eintragId;
            const onClick = klickbar ? () => einplanen(ma.id) : istAusplanbar ? () => ausplanen(eintragId) : undefined;
            const bg = ma.berufsgruppe_id ? bgMap[ma.berufsgruppe_id]?.name : null;

            return (
              <button key={ma.id} disabled={!onClick || busy === ma.id || busy === eintragId} onClick={onClick}
                className={`w-full text-left p-2.5 rounded-lg border ${farbe} transition-colors disabled:cursor-not-allowed`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-text1 text-sm font-semibold truncate">
                      {ma.vorname} {ma.nachname}
                      {bg && <span className="text-text3 text-[10px] ml-1">- {bg}</span>}
                    </div>
                    {info && <div className="text-text2 text-[11px] mt-0.5">{info}</div>}
                  </div>
                  {status === 'eingeteilt' && <span className="text-[var(--red)] text-xs ml-2">x ausplanen</span>}
                  {klickbar && <span className="text-[var(--green)] text-xs ml-2">+ einplanen</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
