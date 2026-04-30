'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const TYP_ICON: Record<string, string> = {
  urlaub: '🏖️', krank: '🤒', fza: '🔄', sonderurlaub: '⭐',
  unbezahlt: '💸', eltern: '👶', fortbildung: '📚', sonstiges: '📌',
};
const TYP_LABEL: Record<string, string> = {
  urlaub: 'Urlaub', krank: 'Krank', fza: 'Freizeitausgleich',
  sonderurlaub: 'Sonderurlaub', unbezahlt: 'Unbezahlt', eltern: 'Elternzeit',
  fortbildung: 'Fortbildung', sonstiges: 'Sonstiges',
};

export function AbwesenheitClient({ initial, rolle, meineMaId }: {
  initial: any[]; rolle: 'admin' | 'leitung' | 'mitarbeiter'; meineMaId: string | null;
}) {
  const params = useSearchParams();
  const [list, setList] = useState(initial);
  const [neuOffen, setNeuOffen] = useState(false);
  const [vorTyp, setVorTyp] = useState<string>('urlaub');

  useEffect(() => {
    const t = params.get('neu');
    if (t) { setVorTyp(t); setNeuOffen(true); }
  }, [params]);

  async function reload() {
    const supabase = createClient();
    const { data } = await supabase.from('urlaube')
      .select('*, mitarbeiter:mitarbeiter_id(id, vorname, nachname, vorgesetzter_id)')
      .order('von', { ascending: false }).limit(100);
    setList(data ?? []);
  }

  async function setStatus(id: string, status: string) {
    const supabase = createClient();
    const { error } = await supabase.from('urlaube').update({ status }).eq('id', id);
    if (error) { alert(error.message); return; }
    reload();
  }

  const canAct = rolle === 'admin' || rolle === 'leitung';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-text1">Abwesenheit</h1>
          <p className="text-text3 text-sm mt-1">Urlaub, Krankmeldung, Freizeitausgleich.</p>
        </div>
        <button onClick={() => { setVorTyp('urlaub'); setNeuOffen(true); }}
          className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold">
          + Antrag stellen
        </button>
      </div>

      <div className="bg-bg1 border border-border1 rounded-xl overflow-hidden">
        {list.length === 0 ? (
          <div className="text-text3 text-sm text-center py-8">Keine Einträge.</div>
        ) : (
          <ul className="divide-y divide-border1">
            {list.map((u) => {
              const istEigen = u.mitarbeiter_id === meineMaId;
              return (
                <li key={u.id} id={u.id} className="p-3 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span>{TYP_ICON[u.typ] ?? '📌'}</span>
                      <span className="text-text1 text-sm font-medium">
                        {u.mitarbeiter?.vorname} {u.mitarbeiter?.nachname}
                      </span>
                      <StatusBadge status={u.status} />
                    </div>
                    <div className="text-text2 text-xs mt-1">
                      {TYP_LABEL[u.typ]} · {fmtD(u.von)} – {fmtD(u.bis)} ({u.tage} Tage)
                    </div>
                    {u.notiz && <div className="text-text3 text-xs mt-1">{u.notiz}</div>}
                  </div>
                  <div className="flex gap-1">
                    {u.status === 'offen' && canAct && !istEigen && (
                      <>
                        <button onClick={() => setStatus(u.id, 'genehmigt')}
                          className="text-xs px-2 py-1 rounded bg-[var(--green-dim)] text-[var(--green)] font-semibold">✓ Genehmigen</button>
                        <button onClick={() => setStatus(u.id, 'abgelehnt')}
                          className="text-xs px-2 py-1 rounded bg-[var(--red-dim)] text-[var(--red)] font-semibold">✕ Ablehnen</button>
                      </>
                    )}
                    {u.status === 'offen' && istEigen && (
                      <button onClick={() => setStatus(u.id, 'zurueckgezogen')}
                        className="text-xs px-2 py-1 rounded border border-border2 text-text2">Zurückziehen</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {neuOffen && (
        <NeuModal vorTyp={vorTyp} meineMaId={meineMaId} canSelectMa={rolle !== 'mitarbeiter'}
          onClose={() => setNeuOffen(false)}
          onSaved={() => { setNeuOffen(false); reload(); }} />
      )}
    </div>
  );
}

function NeuModal({ vorTyp, meineMaId, canSelectMa, onClose, onSaved }: {
  vorTyp: string; meineMaId: string | null; canSelectMa: boolean;
  onClose: () => void; onSaved: () => void;
}) {
  const [typ, setTyp] = useState(vorTyp);
  const [von, setVon] = useState('');
  const [bis, setBis] = useState('');
  const [notiz, setNotiz] = useState('');
  const [maId, setMaId] = useState<string>(meineMaId ?? '');
  const [maListe, setMaListe] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canSelectMa) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('mitarbeiter').select('id, vorname, nachname').order('nachname');
      setMaListe(data ?? []);
    })();
  }, [canSelectMa]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    if (!maId) { setError('Bitte Mitarbeiter wählen.'); setLoading(false); return; }
    const tage = Math.ceil((new Date(bis + 'T12:00').getTime() - new Date(von + 'T12:00').getTime()) / 86400000) + 1;
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('tenant_id, id').single();
    const { error } = await supabase.from('urlaube').insert({
      tenant_id: profile?.tenant_id,
      mitarbeiter_id: maId,
      typ, von, bis, tage,
      status: 'offen',
      notiz: notiz || null,
      beantragt_von: profile?.id,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-base font-bold text-text1 mb-4">Antrag stellen</h2>
        {error && <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">{error}</div>}
        <div className="space-y-3">
          {canSelectMa && (
            <label className="block">
              <Label>Mitarbeiter</Label>
              <select required value={maId} onChange={(e) => setMaId(e.target.value)} className={inputCls}>
                <option value="">— wählen —</option>
                {maListe.map(m => <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <Label>Typ</Label>
            <select value={typ} onChange={(e) => setTyp(e.target.value)} className={inputCls}>
              {Object.entries(TYP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <Label>Von</Label>
              <input type="date" required value={von} onChange={(e) => setVon(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <Label>Bis</Label>
              <input type="date" required value={bis} onChange={(e) => setBis(e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="block">
            <Label>Notiz (optional)</Label>
            <textarea value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={2} className={inputCls} />
          </label>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Abbrechen</button>
          <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Sende…' : 'Beantragen'}
          </button>
        </div>
      </form>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'genehmigt' ? 'bg-[var(--green-dim)] text-[var(--green)]'
    : status === 'abgelehnt' ? 'bg-[var(--red-dim)] text-[var(--red)]'
    : status === 'offen' ? 'bg-[var(--amber-dim)] text-[var(--amber)]'
    : 'bg-bg3 text-text3';
  const lbl = status === 'genehmigt' ? 'Genehmigt' : status === 'abgelehnt' ? 'Abgelehnt' : status === 'offen' ? 'Offen' : 'Zurückgezogen';
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cls}`}>{lbl}</span>;
}

const fmtD = (s: string) => new Date(s + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const inputCls = 'w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm outline-none focus:border-accent';
function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-[10px] uppercase tracking-wide text-text3 mb-1">{children}</span>;
}
