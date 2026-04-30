'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MA {
  id: string;
  vorname: string;
  nachname: string;
  email: string | null;
  telefon: string | null;
  position: string | null;
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
    if (!confirm('Mitarbeiter wirklich löschen? Alle Schichten und Daten dieses MA werden ebenfalls gelöscht.')) return;
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
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Suchen…"
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
                  {list.length === 0 ? 'Noch keine Mitarbeiter angelegt.' : 'Kein Treffer für „' + filter + '".'}
                </td></tr>
              )}
              {gefiltert.map((m) => (
                <tr key={m.id} className="border-t border-border1 hover:bg-bg2">
                  <td className="px-3 py-2 text-text1 font-medium">
                    {m.vorname} {m.nachname}
                    {m.email && <div className="text-[10px] text-text3">{m.email}</div>}
                  </td>
                  <td className="px-3 py-2 text-text2">{m.position ?? '–'}</td>
                  <td className="px-3 py-2 text-text2">{m.berufsgruppe_id ? bgMap[m.berufsgruppe_id] ?? '–' : '–'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${VERTRAG_BADGE[m.vertrag]}`}>{m.vertrag}</span>
                  </td>
                  <td className="px-3 py-2 text-text2 text-xs">{m.vorgesetzter_id ? maMap[m.vorgesetzter_id] ?? '–' : '–'}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => setEdit(m)} className="text-xs px-2 py-1 rounded border border-border2 text-text2 hover:text-text1 mr-1">
                      Bearbeiten
                    </button>
                    <button onClick={() => del(m.id)} className="text-xs px-2 py-1 rounded border border-red-700 text-[var(--red)] hover:bg-[var(--red-dim)]">
                      Löschen
                    </button>
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

  // Vorgesetzter-Optionen: alle anderen Mitarbeiter (sich selbst nicht)
  const vorgesetzteOptionen = alleMa.filter(m => m.id !== werte.id);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
    const payload: any = {
      tenant_id: profile?.tenant_id,
      vorname, nachname,
      email: email || null,
      telefon: telefon || null,
      position: position || null,
      vertrag,
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
    <div className