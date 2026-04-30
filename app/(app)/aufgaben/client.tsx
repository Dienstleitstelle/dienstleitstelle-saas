'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AufgabenClient({ initial, mitarbeiter, objekte, rolle, meineMaId }: {
  initial: any[]; mitarbeiter: any[]; objekte: any[];
  rolle: 'admin' | 'leitung' | 'mitarbeiter'; meineMaId: string | null;
}) {
  const [list, setList] = useState(initial);
  const [neu, setNeu] = useState(false);
  const [filter, setFilter] = useState<'offen' | 'meine' | 'alle' | 'erledigt'>('offen');

  const canCreate = rolle === 'admin' || rolle === 'leitung';

  async function reload() {
    const supabase = createClient();
    const { data } = await supabase.from('aufgaben')
      .select('*, mitarbeiter:mitarbeiter_id(vorname, nachname), objekt:objekt_id(name)')
      .order('erledigt')
      .order('faellig_am', { ascending: true, nullsFirst: false })
      .limit(200);
    setList(data ?? []);
  }

  async function toggle(id: string, erledigt: boolean) {
    const supabase = createClient();
    const update: any = { erledigt };
    if (erledigt) {
      const { data: { user } } = await supabase.auth.getUser();
      update.erledigt_at = new Date().toISOString();
      update.erledigt_von = user?.id;
    } else {
      update.erledigt_at = null;
      update.erledigt_von = null;
    }
    const { error } = await supabase.from('aufgaben').update(update).eq('id', id);
    if (error) { alert(error.message); return; }
    reload();
  }

  async function del(id: string) {
    if (!confirm('Aufgabe loeschen?')) return;
    const supabase = createClient();
    await supabase.from('aufgaben').delete().eq('id', id);
    reload();
  }

  const gefiltert = list.filter(a => {
    if (filter === 'offen') return !a.erledigt;
    if (filter === 'erledigt') return a.erledigt;
    if (filter === 'meine') return a.mitarbeiter_id === meineMaId;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-text1">Aufgaben</h1>
          <p className="text-text3 text-sm mt-1">Standard-Tasks und Sonder-Aufgaben.</p>
        </div>
        {canCreate && (
          <button onClick={() => setNeu(true)} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold">+ Aufgabe</button>
        )}
      </div>

      <div className="flex gap-1 flex-wrap">
        {(['offen', 'meine', 'alle', 'erledigt'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${filter === f ? 'bg-accent text-white' : 'bg-bg2 text-text2 border border-border1'}`}>
            {f === 'offen' ? 'Offen' : f === 'meine' ? 'Meine' : f === 'alle' ? 'Alle' : 'Erledigt'}
          </button>
        ))}
      </div>

      {gefiltert.length === 0 ? (
        <div className="bg-bg1 border border-border1 rounded-xl text-text3 text-sm text-center py-8">Keine Aufgaben.</div>
      ) : (
        <ul className="space-y-2">
          {gefiltert.map((a) => (
            <li key={a.id} className={`bg-bg1 border rounded-xl p-3 flex items-start gap-3 ${a.erledigt ? 'border-border1 opacity-60' : 'border-border1'}`}>
              <input type="checkbox" checked={a.erledigt} onChange={(e) => toggle(a.id, e.target.checked)} className="mt-1 w-4 h-4" />
              <div className="min-w-0 flex-1">
                <div className={`text-text1 text-sm font-medium ${a.erledigt ? 'line-through' : ''}`}>{a.titel}</div>
                {a.beschreibung && <div className="text-text3 text-xs mt-0.5">{a.beschreibung}</div>}
                <div className="text-text3 text-[10px] mt-1 flex flex-wrap gap-x-3">
                  {a.mitarbeiter && <span>MA: {a.mitarbeiter.vorname} {a.mitarbeiter.nachname}</span>}
                  {a.objekt && <span>Objekt: {a.objekt.name}</span>}
                  {a.faellig_am && <span>Faellig: {new Date(a.faellig_am + 'T12:00').toLocaleDateString('de-DE')}</span>}
                </div>
              </div>
              {(canCreate || (meineMaId && a.mitarbeiter_id === meineMaId)) && (
                <button onClick={() => del(a.id)} className="text-xs text-[var(--red)] flex-shrink-0" title="Loeschen">x</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {neu && (
        <NeuModal mitarbeiter={mitarbeiter} objekte={objekte} onClose={() => setNeu(false)} onSaved={() => { setNeu(false); reload(); }} />
      )}
    </div>
  );
}

function NeuModal({ mitarbeiter, objekte, onClose, onSaved }: {
  mitarbeiter: any[]; objekte: any[]; onClose: () => void; onSaved: () => void;
}) {
  const [titel, setTitel] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [maId, setMaId] = useState('');
  const [objektId, setObjektId] = useState('');
  const [faelligAm, setFaelligAm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
    const { error } = await supabase.from('aufgaben').insert({
      tenant_id: profile?.tenant_id,
      titel, beschreibung: beschreibung || null,
      mitarbeiter_id: maId || null, objekt_id: objektId || null,
      faellig_am: faelligAm || null,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-base font-bold text-text1 mb-4">Neue Aufgabe</h2>
        {error && <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">{error}</div>}
        <div className="space-y-3">
          <label className="block">
            <Label>Titel</Label>
            <input required value={titel} onChange={(e) => setTitel(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <Label>Beschreibung</Label>
            <textarea rows={3} value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <Label>Zuweisen an</Label>
            <select value={maId} onChange={(e) => setMaId(e.target.value)} className={inputCls}>
              <option value="">- niemand -</option>
              {mitarbeiter.map((m: any) => <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <Label>Objekt</Label>
              <select value={objektId} onChange={(e) => setObjektId(e.target.value)} className={inputCls}>
                <option value="">-</option>
                {objekte.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
            <label className="block">
              <Label>Faellig am</Label>
              <input type="date" value={faelligAm} onChange={(e) => setFaelligAm(e.target.value)} className={inputCls} />
            </label>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Abbrechen</button>
          <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Speichere...' : 'Anlegen'}
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
