'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { pruefeSchicht, DEFAULT_REGELN, type Regelwerk } from '@/lib/regeln';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface MA {
  id: string;
  vorname: string;
  nachname: string;
  vertrag: string;
  berufsgruppe_id: string | null;
}
interface Objekt {
  id: string;
  name: string;
  adresse: string | null;
  von_default: string | null;
  bis_default: string | null;
}
interface Berufsgruppe { id: string; name: string; regelwerk: Regelwerk; }
interface Einteilung {
  id: string;
  objekt_id: string;
  mitarbeiter_id: string;
  datum: string;
  von: string;
  bis: string;
}
interface Urlaub {
  id: string;
  mitarbeiter_id: string;
  von: string;
  bis: string;
  typ: string;
  status: string;
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
  objekte: Objekt[];
  mitarbeiter: MA[];
  berufsgruppen: Berufsgruppe[];
  rolle: 'admin' | 'leitung' | 'mitarbeiter';
}) {
  const [wkOff, setWkOff] = useState(0);
  const [einteilungen, setEinteilungen] = useState<Einteilung[]>([]);
  const [urlaube, setUrlaube] = useState<Urlaub[]>([]);
  const [modal, setModal] = useState<{ objektId: string; datum: string } | null>(null);

  const monday = useMemo(() => getMonday(wkOff), [wkOff]);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
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
          <button onClick={() => setWkOff(wkOff - 1)} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">← Zurück</button>
          <span className="text-sm font-semibold text-text1 px-3">
            KW {getISOWeek(monday)} · {fmtNice(dates[0])} – {fmtNice(dates[6])}
          </span>
          <button onClick={() => setWkOff(wkOff + 1)} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Vor →</button>
          <button onClick={() => setWkOff(0)} className="px-3 py-1.5 rounded-lg border border-accent text-accent text-sm">Heute</button>
        </div>
        <span className="text-text3 text-xs">
          {canEdit ? 'Auf eine Zelle klicken zum Einteilen.' : 'Nur Lesezugriff. Wende dich an deine Leitung für Änderungen.'}
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
        <EinteilenSidebar
          objektId={modal.objektId}
          datum={modal.datum}
          objekt={objekte.find((o) => o.id === modal.objektId)!}
          mitarbeiter={mitarbeiter}
          bgMap={bgMap}
          alleEinteilungen={einteilungen}
          urlaube={urlaube}
          onClose={() => setModal(null)}
          onSaved={() => reload()}
        />
      )}
    </div>
  );
}

function EinteilenSidebar({ objektId, datum, objekt, mitarbeiter, bgMap, alleEinteilungen, urlaube, onClose, onSaved }: {
  objektId: string;
  datum: string;
  objekt: Objekt;
  mitarbeiter: MA[];
  bgMap: Record<string, Berufsgruppe>;
  alleEinteilungen: Einteilung[];
  urlaube: Urlaub[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [von, setVon] = useState(objekt.von_default?.slice(0, 5) ?? '08:00');
  const [bis, setBis] = useState(objekt.bis_default?.slice(0, 5) ?? '17:00');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bereitsZugewiesen = alleEinteilungen.filter(e => e.objekt_id === objektId && e.datum === datum);
  const zugewieseneIds = new Set(bereitsZugewiesen.map(e => e.mitarbeiter_id));

  // Status pro Mitarbeiter berechnen
  const maStatus = mitarbeiter.map((ma) => {
    // Bereits in diesem Slot
    const ownEintrag = bereitsZugewiesen.find(e => e.mitarbeiter_id === ma.id);
    if (ownEintrag) {
      return { ma, status: 'eingeteilt' as const, info: `${ownEintrag.von.slice(0, 5)}–${ownEintrag.bis.slice(0, 5)}`, eintragId: ownEintrag.id };
    }

    // Urlaub/Krank an diesem Tag?
    const ur = urlaube.find(u =>
      u.mitarbeiter_id === ma.id &&
      datum >= u.von && datum <= u.bis &&
      (u.status === 'genehmigt' || u.status === 'offen')
    );
    if (ur) {
      const typLabel: Record<string, string> = {
        urlaub: 'Urlaub', krank: 'Krank', fza: 'Freizeitausgleich',
        sonderurlaub: 'Sonderurlaub', unbezahlt: 'Unbezahlt frei',
        eltern: 'Elternzeit', fortbildung: 'Fortbildung', sonstiges: 'Abwesend',
      };
      const note = ur.status === 'genehmigt' ? '' : ' (offen)';
      return { ma, status: 'abwesend' as const, info: (typLabel[ur.typ] ?? 'Abwesend') + note };
    }

    // Bereits in einem ANDEREN Objekt am selben Tag?
    const anderesObj = alleEinteilungen.find(e =>
      e.mitarbeiter_id === ma.id && e.datum === datum && e.objekt_id !== objektId
    );

    // Regelwerk-Pruefung
    const regeln = (ma.berufsgruppe_id && bgMap[ma.berufsgruppe_id]?.regelwerk) || DEFAULT_REGELN;
    const andere = alleEinteilungen
      .filter(e => e.mitarbeiter_id === ma.id)
      .map(e => ({ datum: e.datum, von: e.von, bis: e.bis }));
    const pruefung = pruefeSchicht({ schicht: { von, bis, datum }, andereEinteilungen: andere }, regeln);

    if (anderesObj) {
      return {
        ma, status: 'konflikt' as const,
        info: `Bereits in anderem Objekt eingeteilt (${anderesObj.von.slice(0, 5)}–${anderesObj.bis.slice(0, 5)})`,
        regelHinweise: pruefung.hinweise,
      };
    }
    if (pruefung.sperren.length > 0) {
      return { ma, status: 'regel-sperre' as const, info: pruefung.sperren[0], regelHinweise: pruefung.hinweise };
    }
    if (pruefung.hinweise.length > 0) {
      return { ma, status: 'verfuegbar-warn' as const, info: pruefung.hinweise[0], regelHinweise: pruefung.hinweise };
    }
    return { ma, status: 'verfuegbar' as const, info: '' };
  });

  const gefiltert = maStatus.filter(s => {
    if (!filter) return true;
    return `${s.ma.vorname} ${s.ma.nachname}`.toLowerCase().includes(filter.toLowerCase());
  });

  // Sortierung: verfuegbar oben, dann mit-warn, dann konflikt, dann sperre, abwesend, eingeteilt zuletzt
  const sortRank: Record<string, number> = {
    'verfuegbar': 0, 'verfuegbar-warn': 1, 'konflikt': 2, 'regel-sperre': 3, 'abwesend': 4, 'eingeteilt': 5,
  };
  gefiltert.sort((a, b) => {
    const r = sortRank[a.status] - sortRank[b