'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Feld {
  id: string;
  label: string;
  typ: string;
  pflicht: boolean;
  optionen?: string[];
}
interface Vorlage {
  id: string;
  name: string;
  beschreibung: string | null;
  zweck: string;
  felder: Feld[];
}

const ZWECK_ICON: Record<string, string> = {
  uebergabe: '🤝', vorfall: '⚠️', wartung: '🔧', rundgang: '🚶',
  medikamente: '💊', postenbuch: '📓', auftraggeber: '📋', sonstiges: '📌',
};

export function BerichteClient({ vorlagen, eintraege, objekte }: {
  vorlagen: Vorlage[]; eintraege: any[]; objekte: { id: string; name: string }[];
}) {
  const [list, setList] = useState(eintraege);
  const [neu, setNeu] = useState<Vorlage | null>(null);
  const [filter, setFilter] = useState('');

  async function reload() {
    const supabase = createClient();
    const { data } = await supabase.from('berichts_eintraege')
      .select('*, vorlage:vorlage_id(name, zweck), objekt:objekt_id(name), ersteller:created_by(vorname, nachname)')
      .order('created_at', { ascending: false }).limit(50);
    setList(data ?? []);
  }

  const gefiltert = list.filter(e => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (e.vorlage?.name ?? '').toLowerCase().includes(q) || (e.objekt?.name ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text1">Berichte</h1>
        <p className="text-text3 text-sm mt-1">Übergaben, Vorfälle, Wartungen, Postenbuch.</p>
      </div>

      {vorlagen.length === 0 ? (
        <div className="bg-bg1 border border-border1 rounded-xl text-text3 text-sm text-center py-8">
          Noch keine Berichts-Vorlagen angelegt. Admin: <a href="/einstellungen/berichts-vorlagen" className="text-accent">Vorlagen anlegen</a>.
        </div>
      ) : (
        <>
          <div>
            <div className="text-text2 text-xs uppercase tracking-wide mb-2">+ Neuen Bericht ausfüllen</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {vorlagen.map(v => (
                <button key={v.id} onClick={() => setNeu(v)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-border1 bg-bg1 hover:border-accent transition-colors text-left">
                  <span className="text-xl">{ZWECK_ICON[v.zweck] ?? '📋'}</span>
                  <div className="min-w-0">
                    <div className="text-text1 text-sm font-semibold truncate">{v.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-text2 text-xs uppercase tracking-wide">Letzte Berichte</div>
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Suchen…"
                className="px-2 py-1 rounded bg-bg2 border border-border1 text-text1 text-xs w-40" />
            </div>
            {gefiltert.length === 0 ? (
              <div className="bg-bg1 border border-border1 rounded-xl text-text3 text-sm text-center py-8">Keine Einträge.</div>
            ) : (
              <ul className="space-y-2">
                {gefiltert.map((e: any) => (
                  <li key={e.id}>
                    <Link href={`/berichte/${e.id}`} className="block bg-bg1 border border-border1 rounded-xl p-3 hover:border-accent transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{ZWECK_ICON[e.vorlage?.zweck] ?? '📋'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-text1 text-sm font-semibold">{e.vorlage?.name}</div>
                        <div className="text-text3 text-xs">
                          {e.objekt?.name && <span>{e.objekt.name} · </span>}
                          von {e.ersteller?.vorname} {e.ersteller?.nachname} · {new Date(e.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {e.schweregrad && (
                          <div className="text-[var(--amber)] text-xs mt-1">Schweregrad: {'⚠️'.repeat(e.schweregrad)}</div>
                        )}
                        <div className="mt-2 space-y-0.5 text-text2 text-xs">
                          {Object.entries(e.werte || {}).slice(0, 4).map(([k, v]: any) => (
                            <div key={k}><strong className="text-text1">{k}:</strong> {String(v).slice(0, 100)}</div>
                          ))}
                        </div>
                      </div>
                      <StatusBadge status={e.status} />
                    </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {neu && <BerichtModal vorlage={neu} objekte={objekte} onClose={() => setNeu(null)} onSaved={() => { setNeu(null); reload(); }} />}
    </div>
  );
}

function BerichtModal({ vorlage, objekte, onClose, onSaved }: {
  vorlage: Vorlage; objekte: { id: string; name: string }[];
  onClose: () => void; onSaved: () => void;
}) {
  const [werte, setWerte] = useState<Record<string, any>>({});
  const [objektId, setObjektId] = useState<string>('');
  const [schweregrad, setSchweregrad] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setVal(label: string, val: any) {
    setWerte({ ...werte, [label]: val });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    // Pflichtfelder pruefen
    for (const f of vorlage.felder) {
      if (f.pflicht && !werte[f.label]) {
        setError(`Pflichtfeld fehlt: ${f.label}`); setLoading(false); return;
      }
    }
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('tenant_id, mitarbeiter_id').single();
    const payload: any = {
      tenant_id: profile?.tenant_id,
      vorlage_id: vorlage.id,
      objekt_id: objektId || null,
      mitarbeiter_id: profile?.mitarbeiter_id,
      werte,
      schweregrad: vorlage.zweck === 'vorfall' && schweregrad > 0 ? schweregrad : null,
    };
    const { error } = await supabase.from('berichts_eintraege').insert(payload);
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-bold text-text1 mb-1">{vorlage.name}</h2>
        {vorlage.beschreibung && <p className="text-text3 text-xs mb-4">{vorlage.beschreibung}</p>}
        {error && <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">{error}</div>}

        <div className="space-y-3">
          {objekte.length > 0 && (
            <label className="block">
              <Label>Objekt (optional)</Label>
              <select value={objektId} onChange={(e) => setObjektId(e.target.value)} className={inputCls}>
                <option value="">— wählen —</option>
                {objekte.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
          )}

          {vorlage.zweck === 'vorfall' && (
            <label className="block">
              <Label>Schweregrad (1 = niedrig, 5 = kritisch)</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setSchweregrad(n)}
                    className={`px-3 py-2 rounded-lg border ${schweregrad >= n ? 'bg-[var(--amber-dim)] border-amber-700 text-[var(--amber)]' : 'bg-bg2 border-border1 text-text3'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </label>
          )}

          {vorlage.felder.map((f, idx) => (
            <FeldInput key={idx} feld={f} wert={werte[f.label]} onChange={(v) => setVal(f.label, v)} />
          ))}
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Abbrechen</button>
          <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Speichere…' : 'Bericht speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FeldInput({ feld, wert, onChange }: { feld: Feld; wert: any; onChange: (v: any) => void }) {
  const lbl = <Label>{feld.label} {feld.pflicht && <span className="text-[var(--red)]">*</span>}</Label>;
  const v = wert ?? '';
  switch (feld.typ) {
    case 'text':
      return <label className="block">{lbl}<input value={v} onChange={(e) => onChange(e.target.value)} className={inputCls} /></label>;
    case 'lang_text':
      return <label className="block">{lbl}<textarea rows={4} value={v} onChange={(e) => onChange(e.target.value)} className={inputCls} /></label>;
    case 'zahl':
      return <label className="block">{lbl}<input type="number" value={v} onChange={(e) => onChange(e.target.value)} className={inputCls} /></label>;
    case 'datum':
      return <label className="block">{lbl}<input type="date" value={v} onChange={(e) => onChange(e.target.value)} className={inputCls} /></label>;
    case 'uhrzeit':
      return <label className="block">{lbl}<input type="time" value={v} onChange={(e) => onChange(e.target.value)} className={inputCls} /></label>;
    case 'auswahl':
      return (
        <label className="block">{lbl}
          <select value={v} onChange={(e) => onChange(e.target.value)} className={inputCls}>
            <option value="">— wählen —</option>
            {(feld.optionen ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      );
    case 'mehrfachauswahl':
      return (
        <div>{lbl}
          <div className="space-y-1">
            {(feld.optionen ?? []).map(o => {
              const arr: string[] = Array.isArray(v) ? v : [];
              const checked = arr.includes(o);
              return (
                <label key={o} className="flex items-center gap-2 text-sm text-text2 cursor-pointer">
                  <input type="checkbox" checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked ? [...arr, o] : arr.filter(x => x !== o);
                      onChange(next);
                    }} />
                  {o}
                </label>
              );
            })}
          </div>
        </div>
      );
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm text-text2 cursor-pointer">
          <input type="checkbox" checked={!!v} onChange={(e) => onChange(e.target.checked)} />
          <span>{feld.label} {feld.pflicht && <span className="text-[var(--red)]">*</span>}</span>
        </label>
      );
    case 'bewertung':
      return (
        <div>{lbl}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => onChange(n)}
                className={`px-3 py-2 rounded-lg border ${Number(v) >= n ? 'bg-[var(--amber-dim)] border-amber-700 text-[var(--amber)]' : 'bg-bg2 border-border1 text-text3'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      );
    default:
      return (
        <label className="block">{lbl}
          <input value={v} onChange={(e) => onChange(e.target.value)} placeholder={`(Typ ${feld.typ} — Datei-Upload kommt bald)`} className={inputCls} />
        </label>
      );
  }
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'erledigt' ? 'bg-[var(--green-dim)] text-[var(--green)]'
    : status === 'in_bearbeitung' ? 'bg-[var(--amber-dim)] text-[var(--amber)]'
    : status === 'archiviert' ? 'bg-bg3 text-text3'
    : 'bg-[var(--accent-dim2)] text-accent';
  const lbl = status === 'erledigt' ? 'Erledigt' : status === 'in_bearbeitung' ? 'In Bearbeitung' : status === 'archiviert' ? 'Archiviert' : 'Offen';
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${cls}`}>{lbl}</span>;
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm outline-none focus:border-accent';
function Lab