'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Feld {
  id: string;
  label: string;
  typ: 'text' | 'lang_text' | 'zahl' | 'datum' | 'uhrzeit' | 'auswahl' | 'mehrfachauswahl' | 'checkbox' | 'bewertung' | 'unterschrift' | 'foto';
  pflicht: boolean;
  optionen?: string[];
  hilfetext?: string;
}

interface Vorlage {
  id?: string;
  name: string;
  beschreibung: string | null;
  zweck: string;
  felder: Feld[];
  ausfuelldauer: string;
  rolle_pflicht: string;
  aktiv: boolean;
}

const ZWECK_LABEL: Record<string, string> = {
  uebergabe: '🤝 Übergabe',
  vorfall: '⚠️ Vorfall',
  wartung: '🔧 Wartung',
  rundgang: '🚶 Rundgang',
  medikamente: '💊 Medikamente',
  postenbuch: '📓 Postenbuch',
  auftraggeber: '📋 Auftraggeber-Bericht',
  sonstiges: '📌 Sonstiges',
};

const FELD_TYP_LABEL: Record<Feld['typ'], string> = {
  text: 'Text (kurz)',
  lang_text: 'Text (lang)',
  zahl: 'Zahl',
  datum: 'Datum',
  uhrzeit: 'Uhrzeit',
  auswahl: 'Auswahl (Dropdown)',
  mehrfachauswahl: 'Mehrfachauswahl',
  checkbox: 'Ja/Nein-Häkchen',
  bewertung: 'Bewertung 1–5',
  unterschrift: 'Unterschrift',
  foto: 'Foto-Upload',
};

export function BerichtsVorlagenClient({ initial }: { initial: Vorlage[] }) {
  const [list, setList] = useState<Vorlage[]>(initial);
  const [edit, setEdit] = useState<Vorlage | null>(null);

  async function reload() {
    const supabase = createClient();
    const { data } = await supabase.from('berichts_vorlagen').select('*').order('name');
    setList((data ?? []) as Vorlage[]);
  }

  async function del(id: string) {
    if (!confirm('Vorlage wirklich löschen? Bereits ausgefüllte Berichte bleiben erhalten.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('berichts_vorlagen').delete().eq('id', id);
    if (error) alert(error.message);
    else reload();
  }

  function neueVorlage() {
    setEdit({
      name: '', beschreibung: '', zweck: 'sonstiges',
      felder: [], ausfuelldauer: 'beliebig', rolle_pflicht: 'mitarbeiter', aktiv: true,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/einstellungen" className="text-text3 text-xs hover:text-text1">← Einstellungen</Link>
          <h1 className="text-xl font-bold text-text1">Berichts-Vorlagen</h1>
          <p className="text-text3 text-sm mt-1">
            Definiere die Formulare, die deine Mitarbeiter ausfüllen — Übergabe, Vorfall, Postenbuch, Wartung etc. Felder frei wählbar.
          </p>
        </div>
        <button onClick={neueVorlage} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold">
          + Neue Vorlage
        </button>
      </div>

      {list.length === 0 ? (
        <div className="bg-bg1 border border-border1 rounded-xl text-text3 text-sm text-center py-8">
          Noch keine Vorlagen. Lege eine an, damit Mitarbeiter strukturierte Berichte schreiben können.
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-3">
          {list.map((v) => (
            <li key={v.id} className="bg-bg1 border border-border1 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-text1 font-semibold flex items-center gap-2">
                    <span>{ZWECK_LABEL[v.zweck] ?? '📋'}</span>
                    {v.name}
                  </div>
                  {v.beschreibung && <div className="text-text3 text-xs mt-1">{v.beschreibung}</div>}
                  <div className="text-text2 text-[11px] mt-2">
                    {v.felder.length} {v.felder.length === 1 ? 'Feld' : 'Felder'} · für {v.rolle_pflicht}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setEdit(v)} className="text-xs px-2 py-1 rounded border border-border2 text-text2">Bearbeiten</button>
                  <button onClick={() => v.id && del(v.id)} className="text-xs px-2 py-1 rounded border border-red-700 text-[var(--red)]">Löschen</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {edit && <VorlageEditor werte={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

function VorlageEditor({ werte, onClose, onSaved }: { werte: Vorlage; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Vorlage>(werte);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addFeld() {
    const neu: Feld = { id: 'f' + Date.now(), label: '', typ: 'text', pflicht: false };
    setV({ ...v, felder: [...v.felder, neu] });
  }

  function updateFeld(idx: number, patch: Partial<Feld>) {
    const neueFelder = v.felder.map((f, i) => i === idx ? { ...f, ...patch } : f);
    setV({ ...v, felder: neueFelder });
  }

  function removeFeld(idx: number) {
    setV({ ...v, felder: v.felder.filter((_, i) => i !== idx) });
  }

  function moveFeld(idx: number, dir: -1 | 1) {
    const next = [...v.felder];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setV({ ...v, felder: next });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
    const payload: any = {
      tenant_id: profile?.tenant_id,
      name: v.name, beschreibung: v.beschreibung || null,
      zweck: v.zweck, felder: v.felder, ausfuelldauer: v.ausfuelldauer,
      rolle_pflicht: v.rolle_pflicht, aktiv: v.aktiv,
    };
    const op = v.id
      ? supabase.from('berichts_vorlagen').update(payload).eq('id', v.id)
      : supabase.from('berichts_vorlagen').insert(payload);
    const { error } = await op;
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-bold text-text1 mb-4">{v.id ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</h2>
        {error && <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">{error}</div>}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <Label>Name</Label>
              <input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })}
                placeholder="z. B. Tagesübergabe Sicherheitsdienst" className={inputCls} />
            </label>
            <label className="block">
              <Label>Zweck</Label>
              <select value={v.zweck} onChange={(e) => setV({ ...v, zweck: e.target.value })} className={inputCls}>
                {Object.entries(ZWECK_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <Label>Beschreibung</Label>
            <input value={v.beschreibung ?? ''} onChange={(e) => setV({ ...v, beschreibung: e.target.value })}
              placeholder="Wann wird diese Vorlage benutzt?" className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <Label>Ausfüllzeitpunkt</Label>
              <select value={v.ausfuelldauer} onChange={(e) => setV({ ...v, ausfuelldauer: e.target.value })} className={inputCls}>
                <option value="beliebig">Beliebig</option>
                <option value="schichtbeginn">Bei Schichtbeginn</option>
                <option value="schichtende">Bei Schichtende</option>
                <option value="bei_bedarf">Bei Bedarf</option>
              </select>
            </label>
            <label className="block">
              <Label>Wer darf ausfüllen</Label>
              <select value={v.rolle_pflicht} onChange={(e) => setV({ ...v, rolle_pflicht: e.target.value })} className={inputCls}>
                <option value="alle">Alle</option>
                <option value="mitarbeiter">Mitarbeiter</option>
                <option value="leitung">Nur Leitung</option>
                <option value="admin">Nur Admin</option>
              </select>
            </label>
          </div>

          <div className="border-t border-border1 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-text1 font-semibold text-sm">Felder ({v.felder.length})</div>
              <button type="button" onClick={addFeld} className="text-xs px-2 py-1 rounded border border-accent text-accent">+ Feld</button>
            </div>

            {v.felder.length === 0 ? (
              <div className="text-text3 text-sm text-center py-4 border border-dashed border-border1 rounded-lg">
                Noch keine Felder. Klick „+ Feld".
              </div>
            ) : (
              <ul className="space-y-2">
                {v.felder.map((f, idx) => (
                  <li key={f.id} className="border border-border1 rounded-lg p-3 bg-bg2">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label>Feldname</Label>
                        <input value={f.label} onChange={(e) => updateFeld(idx, { label: e.target.value })}
                          placeholder="z. B. Vorkommnisse" className={inputCls} />
                      </div>
                      <div className="col-span-4">
                        <Label>Typ</Label>
                        <select value={f.typ} onChange={(e) => updateFeld(idx, { typ: e.target.value as Feld['typ'] })} className={inputCls}>
                          {Object.entries(FELD_TYP_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3 flex items-center gap-1 justify-end">
                        <label className="flex items-center gap-1 text-xs text-text2">
                          <input type="checkbox" checked={f.pflicht} onChange={(e) => updateFeld(idx, { pflicht: e.target.checked })} />
                          Pflicht
                        </label>
                        <button type="button" onClick={() => moveFeld(idx, -1)} disabled={idx === 0}
                          className="text-text3 disabled:opacity-30 px-1">▲</button>
                        <button type="button" onClick={() => moveFeld(idx, 1)} disabled={idx === v.felder.length - 1}
                          className="text-text3 disabled:opacity-30 px-1">▼</button>
                        <button type="button" onClick={() => removeFeld(idx)} className="text-[var(--red)] px-1">✕</button>
                      </div>
                    </div>
                    {(f.typ === 'auswahl' || f.typ === 'mehrfachauswahl') && (
                      <div className="mt-2">
                        <Label>Optionen (eine pro Zeile)</Label>
                        <textarea rows={3}
                          value={(f.optionen ?? []).join('\n')}
                          onChange={(e) => updateFeld(idx, { optionen: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) })}
                          placeholder="Option 1&#10;Option 2&#10;Option 3" className={inputCls} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Abbrechen</button>
          <button type="submit" disabled={loading || !v.name} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Speichere…' : v.id ? 'Aktualisieren' : 'Anlegen'}
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
