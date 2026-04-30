'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_REGELN, type Regelwerk } from '@/lib/regeln';

interface Berufsgruppe {
  id: string;
  name: string;
  beschreibung: string | null;
  regelwerk: Regelwerk;
  aktiv: boolean;
}

export function BerufsgruppenClient({ initial }: { initial: Berufsgruppe[] }) {
  const [list, setList] = useState<Berufsgruppe[]>(initial);
  const [edit, setEdit] = useState<Partial<Berufsgruppe> | null>(null);

  async function reload() {
    const supabase = createClient();
    const { data } = await supabase.from('berufsgruppen').select('*').order('name');
    setList((data ?? []) as Berufsgruppe[]);
  }

  async function del(id: string) {
    if (!confirm('Berufsgruppe wirklich löschen? Mitarbeiter dieser Gruppe verlieren ihre Zuordnung.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('berufsgruppen').delete().eq('id', id);
    if (error) alert(error.message);
    else reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/einstellungen" className="text-text3 text-xs hover:text-text1">← Einstellungen</Link>
          <h1 className="text-xl font-bold text-text1">Berufsgruppen & Regeln</h1>
          <p className="text-text3 text-sm mt-1">
            Definiere die Berufsgruppen deiner Mitarbeiter. Pro Gruppe legst du Regeln fest, die der Dienstplan beim Einteilen prüft.
          </p>
        </div>
        <button onClick={() => setEdit({ name: '', beschreibung: '', regelwerk: DEFAULT_REGELN, aktiv: true })}
          className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90">
          + Neue Berufsgruppe
        </button>
      </div>

      <div className="bg-bg1 border border-border1 rounded-xl overflow-hidden">
        {list.length === 0 ? (
          <div className="text-text3 text-sm text-center py-8">
            Noch keine Berufsgruppen angelegt. Klick „+ Neue Berufsgruppe" oben rechts.
          </div>
        ) : (
          <ul className="divide-y divide-border1">
            {list.map((b) => (
              <li key={b.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-text1 font-semibold">{b.name}</div>
                  {b.beschreibung && <div className="text-text3 text-xs mt-0.5">{b.beschreibung}</div>}
                  <div className="text-text2 text-[11px] mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {b.regelwerk?.maxStundenProTag != null && <span>Max h/Tag: <strong>{b.regelwerk.maxStundenProTag}</strong></span>}
                    {b.regelwerk?.minRuhezeitStunden != null && <span>Min. Ruhe: <strong>{b.regelwerk.minRuhezeitStunden}h</strong></span>}
                    {b.regelwerk?.maxWochenstunden != null && <span>Max h/Woche: <strong>{b.regelwerk.maxWochenstunden}</strong></span>}
                    {b.regelwerk?.maxStundenProMonat != null && <span>Max h/Monat: <strong>{b.regelwerk.maxStundenProMonat}</strong></span>}
                    {b.regelwerk?.sonntagErlaubt === false && <span className="text-[var(--amber)]">Kein Sonntag</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEdit(b)} className="text-xs px-2 py-1 rounded border border-border2 text-text2 hover:text-text1">
                    Bearbeiten
                  </button>
                  <button onClick={() => del(b.id)} className="text-xs px-2 py-1 rounded border border-red-700 text-[var(--red)] hover:bg-[var(--red-dim)]">
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {edit && <RegelwerkModal werte={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

function RegelwerkModal({ werte, onClose, onSaved }: {
  werte: Partial<Berufsgruppe>; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(werte.name ?? '');
  const [beschreibung, setBeschreibung] = useState(werte.beschreibung ?? '');
  const r0: Regelwerk = werte.regelwerk ?? {};
  const [maxTag, setMaxTag] = useState<string>(r0.maxStundenProTag?.toString() ?? '');
  const [minRuhe, setMinRuhe] = useState<string>(r0.minRuhezeitStunden?.toString() ?? '');
  const [maxWoche, setMaxWoche] = useState<string>(r0.maxWochenstunden?.toString() ?? '');
  const [maxMonat, setMaxMonat] = useState<string>(r0.maxStundenProMonat?.toString() ?? '');
  const [sonntag, setSonntag] = useState<boolean>(r0.sonntagErlaubt !== false);
  const [pause6, setPause6] = useState<string>(r0.pauseSchwellen?.find(p => p.abStunden === 6)?.minMinuten?.toString() ?? '30');
  const [pause9, setPause9] = useState<string>(r0.pauseSchwellen?.find(p => p.abStunden === 9)?.minMinuten?.toString() ?? '45');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const num = (s: string) => (s === '' ? undefined : Number(s));
    const regelwerk: Regelwerk = {
      maxStundenProTag: num(maxTag),
      minRuhezeitStunden: num(minRuhe),
      maxWochenstunden: num(maxWoche),
      maxStundenProMonat: num(maxMonat),
      sonntagErlaubt: sonntag,
      pauseSchwellen: [
        { abStunden: 6, minMinuten: Number(pause6 || 0) },
        { abStunden: 9, minMinuten: Number(pause9 || 0) },
      ].filter(p => p.minMinuten > 0),
    };
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
    const payload: any = { name, beschreibung: beschreibung || null, regelwerk, tenant_id: profile?.tenant_id };
    const op = werte.id
      ? supabase.from('berufsgruppen').update(payload).eq('id', werte.id)
      : supabase.from('berufsgruppen').insert(payload);
    const { error } = await op;
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-bold text-text1 mb-1">
          {werte.id ? 'Berufsgruppe bearbeiten' : 'Neue Berufsgruppe'}
        </h2>
        <p className="text-text3 text-xs mb-4">
          Diese Regeln werden im Dienstplan geprüft. Leer = keine Prüfung für dieses Feld.
        </p>

        {error && <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">{error}</div>}

        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <input required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Sicherheit, Schulwegbegleitung, Objektschutz"
              className={inputCls} />
          </div>
          <div>
            <Label>Beschreibung (optional)</Label>
            <input value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="Kurzbeschreibung der Tätigkeit"
              className={inputCls} />
          </div>

          <div className="border-t border-border1 pt-4">
            <div className="text-text1 font-semibold text-sm mb-1">Regelwerk</div>
            <p className="text-text3 text-xs mb-3">
              Werte gelten für alle Mitarbeiter dieser Berufsgruppe. Felder leer lassen = keine Prüfung.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max. Stunden pro Tag</Label>
                <input type="number" min={0} step={0.5} value={maxTag} onChange={(e) => setMaxTag(e.target.value)}
                  placeholder="z. B. 10" className={inputCls} />
              </div>
              <div>
                <Label>Min. Ruhezeit zwischen Schichten (h)</Label>
                <input type="number" min={0} step={0.5} value={minRuhe} onChange={(e) => setMinRuhe(e.target.value)}
                  placeholder="z. B. 11" className={inputCls} />
              </div>
              <div>
                <Label>Max. Stunden pro Woche</Label>
                <input type="number" min={0} value={maxWoche} onChange={(e) => setMaxWoche(e.target.value)}
                  placeholder="z. B. 48" className={inputCls} />
              </div>
              <div>
                <Label>Max. Stunden pro Monat</Label>
                <input type="number" min={0} value={maxMonat} onChange={(e) => setMaxMonat(e.target.value)}
                  placeholder="für geringfügige Beschäftigung" className={inputCls} />
              </div>
              <div>
                <Label>Pause ab 6 h (Min.)</Label>
                <input type="number" min={0} value={pause6} onChange={(e) => setPause6(e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <Label>Pause ab 9 h (Min.)</Label>
                <input type="number" min={0} value={pause9} onChange={(e) => setPause9(e.target.value)}
                  className={inputCls} />
              </div>
            </div>

            <label className="flex items-center gap-2 mt-4 text-sm text-text2 cursor-pointer">
              <input type="checkbox" checked={sonntag} onChange={(e) => setSonntag(e.target.checked)} />
              Sonntagsarbeit erlaubt
            </label>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">
            Abbrechen
          </button>
          <button type="submit" disabled={loading || !name}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Speichere…' : werte.id ? 'Aktualisieren' : 'Anlegen'}
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
