'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MA {
  id: string; vorname: string; nachname: string;
  email: string | null; telefon: string | null; position: string | null;
  vertrag: 'Vollzeit' | 'Teilzeit' | 'Minijob' | 'Aushilfe';
  qualifikation: string | null;
  berufsgruppe_id: string | null;
  vorgesetzter_id: string | null;
  eintrittsdatum: string | null;
  jahresurlaub_tage: number | null;
  lohn_pro_stunde: number | null;
  aktiv: boolean;
}
interface Berufsgruppe { id: string; name: string }

const VERTRAG_BADGE: Record<MA['vertrag'], string> = {
  Vollzeit: 'bg-[var(--accent-dim2)] text-accent',
  Teilzeit: 'bg-[var(--green-dim)] text-[var(--green)]',
  Minijob:  'bg-[var(--amber-dim)] text-[var(--amber)]',
  Aushilfe: 'bg-bg3 text-text2',
};

export function MitarbeiterClient({ initial, berufsgruppen }: { initial: MA[]; berufsgruppen: Berufsgruppe[] }) {
  const [list, setList] = useState<MA[]>(initial);
  const [edit, setEdit] = useState<Partial<MA> | null>(null);
  const [filter, setFilter] = useState('');

  async function reload() {
    const supabase = createClient();
    const { data } = await supabase.from('mitarbeiter').select('*').order('nachname');
    setList((data ?? []) as MA[]);
  }

  async function del(id: string) {
    if (!confirm('Mitarbeiter wirklich loeschen?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('mitarbeiter').delete().eq('id', id);
    if (error) alert(error.message);
    else reload();
  }

  const gefiltert = list.filter(m => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      `${m.vorname} ${m.nachname}`.toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q) ||
      (m.position ?? '').toLowerCase().includes(q)
    );
  });

  const bgMap = Object.fromEntries(berufsgruppen.map(b => [b.id, b.name]));
  const maMap = Object.fromEntries(list.map(m => [m.id, `${m.vorname} ${m.nachname}`]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-text1">Mitarbeiter</h1>
        <div className="flex items-center gap-2">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Suchen..."
            className="px-3 py-1.5 rounded-lg bg-bg2 border border-border1 text-text1 text-sm w-48" />
          <button onClick={() => setEdit({ vertrag: 'Vollzeit', aktiv: true })}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90">
            + Mitarbeiter
          </button>
        </div>
      </div>

      <div className="bg-bg1 border border-border1 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg2 text-text3 text-[10px] uppercase">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Position</th>
                <th className="text-left px-3 py-2">Berufsgruppe</th>
                <th className="text-left px-3 py-2">Vertrag</th>
                <th className="text-left px-3 py-2">Vorgesetzter</th>
                <th className="text-right px-3 py-2">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {gefiltert.length === 0 && (
                <tr><td colSpan={6} className="text-center text-text3 py-6 text-sm">
                  {list.length === 0 ? 'Noch keine Mitarbeiter angelegt.' : 'Kein Treffer.'}
                </td></tr>
              )}
              {gefiltert.map((m) => (
                <tr key={m.id} className="border-t border-border1 hover:bg-bg2">
                  <td className="px-3 py-2 text-text1 font-medium">
                    {m.vorname} {m.nachname}
                    {m.email && <div className="text-[10px] text-text3">{m.email}</div>}
                  </td>
                  <td className="px-3 py-2 text-text2">{m.position ?? '-'}</td>
                  <td className="px-3 py-2 text-text2">{m.berufsgruppe_id ? bgMap[m.berufsgruppe_id] ?? '-' : '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${VERTRAG_BADGE[m.vertrag]}`}>{m.vertrag}</span>
                  </td>
                  <td className="px-3 py-2 text-text2 text-xs">{m.vorgesetzter_id ? maMap[m.vorgesetzter_id] ?? '-' : '-'}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => setEdit(m)} className="text-xs px-2 py-1 rounded border border-border2 text-text2 hover:text-text1 mr-1">Bearbeiten</button>
                    <button onClick={() => del(m.id)} className="text-xs px-2 py-1 rounded border border-red-700 text-[var(--red)]">Loeschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <MaModal werte={edit} berufsgruppen={berufsgruppen} alleMa={list}
          onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />
      )}
    </div>
  );
}

function MaModal({ werte, berufsgruppen, alleMa, onClose, onSaved }: {
  werte: Partial<MA>; berufsgruppen: Berufsgruppe[]; alleMa: MA[];
  onClose: () => void; onSaved: () => void;
}) {
  const [vorname, setVorname] = useState(werte.vorname ?? '');
  const [nachname, setNachname] = useState(werte.nachname ?? '');
  const [email, setEmail] = useState(werte.email ?? '');
  const [telefon, setTelefon] = useState(werte.telefon ?? '');
  const [position, setPosition] = useState(werte.position ?? '');
  const [vertrag, setVertrag] = useState<MA['vertrag']>(werte.vertrag ?? 'Vollzeit');
  const [qualifikation, setQualifikation] = useState(werte.qualifikation ?? '');
  const [berufsgruppeId, setBerufsgruppeId] = useState<string>(werte.berufsgruppe_id ?? '');
  const [vorgesetzterId, setVorgesetzterId] = useState<string>(werte.vorgesetzter_id ?? '');
  const [eintrittsdatum, setEintrittsdatum] = useState(werte.eintrittsdatum ?? '');
  const [jahresurlaubTage, setJahresurlaubTage] = useState<string>(werte.jahresurlaub_tage?.toString() ?? '');
  const [lohnProStunde, setLohnProStunde] = useState<string>(werte.lohn_pro_stunde?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const vorgesetzteOptionen = alleMa.filter(m => m.id !== werte.id);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
    const payload: any = {
      tenant_id: profile?.tenant_id,
      vorname, nachname,
      email: email || null, telefon: telefon || null,
      position: position || null, vertrag,
      qualifikation: qualifikation || null,
      berufsgruppe_id: berufsgruppeId || null,
      vorgesetzter_id: vorgesetzterId || null,
      eintrittsdatum: eintrittsdatum || null,
      jahresurlaub_tage: jahresurlaubTage === '' ? null : Number(jahresurlaubTage),
      lohn_pro_stunde: lohnProStunde === '' ? null : Number(lohnProStunde),
    };
    const op = werte.id
      ? supabase.from('mitarbeiter').update(payload).eq('id', werte.id)
      : supabase.from('mitarbeiter').insert(payload);
    const { error } = await op;
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-bold text-text1 mb-4">{werte.id ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}</h2>
        {error && <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">{error}</div>}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Vorname" required value={vorname} onChange={setVorname} />
            <Field label="Nachname" required value={nachname} onChange={setNachname} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="E-Mail" type="email" value={email} onChange={setEmail} />
            <Field label="Telefon" value={telefon} onChange={setTelefon} />
          </div>
          <Field label="Position" value={position} onChange={setPosition} placeholder="z. B. Sicherheitsmitarbeiter" />
          <Field label="Qualifikation/Notiz" value={qualifikation} onChange={setQualifikation} />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Berufsgruppe</Label>
              <select value={berufsgruppeId} onChange={(e) => setBerufsgruppeId(e.target.value)} className={inputCls}>
                <option value="">- keine -</option>
                {berufsgruppen.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {berufsgruppen.length === 0 && (
                <p className="text-[10px] text-text3 mt-1">
                  Noch keine Berufsgruppen. <a href="/einstellungen/berufsgruppen" className="text-accent">Anlegen</a>.
                </p>
              )}
            </div>
            <div>
              <Label>Vertragsart</Label>
              <select value={vertrag} onChange={(e) => setVertrag(e.target.value as MA['vertrag'])} className={inputCls}>
                <option>Vollzeit</option>
                <option>Teilzeit</option>
                <option>Minijob</option>
                <option>Aushilfe</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Vorgesetzter</Label>
            <select value={vorgesetzterId} onChange={(e) => setVorgesetzterId(e.target.value)} className={inputCls}>
              <option value="">- direkt der Geschaeftsfuehrung unterstellt -</option>
              {vorgesetzteOptionen.map(m => (
                <option key={m.id} value={m.id}>{m.vorname} {m.nachname}{m.position ? ' - ' + m.position : ''}</option>
              ))}
            </select>
            <p className="text-[10px] text-text3 mt-1">Erhaelt Antraege dieses Mitarbeiters.</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Eintrittsdatum</Label>
              <input type="date" value={eintrittsdatum} onChange={(e) => setEintrittsdatum(e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label>Jahresurlaub (Tage)</Label>
              <input type="number" min={0} step={0.5} value={jahresurlaubTage} onChange={(e) => setJahresurlaubTage(e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label>Stundenlohn (EUR)</Label>
              <input type="number" min={0} step={0.01} value={lohnProStunde} onChange={(e) => setLohnProStunde(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        <p className="text-[10px] text-text3 mt-4">
          Login-Einladung separat unter <a href="/einladungen" className="text-accent">Team einladen</a>.
        </p>

        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Abbrechen</button>
          <button type="submit" disabled={loading || !vorname || !nachname} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Speichere...' : werte.id ? 'Aktualisieren' : 'Anlegen'}
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

function Field({ label, value, onChange, type = 'text', required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </label>
  );
}
