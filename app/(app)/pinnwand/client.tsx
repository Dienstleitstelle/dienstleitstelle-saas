'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function PinnwandClient({ initial, canPost }: { initial: any[]; canPost: boolean }) {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);

  async function reload() {
    const supabase = createClient();
    const { data } = await supabase.from('pinnwand')
      .select('*, ersteller:created_by(vorname, nachname)')
      .order('angeheftet', { ascending: false })
      .order('created_at', { ascending: false }).limit(50);
    setList(data ?? []);
  }

  async function del(id: string) {
    if (!confirm('Beitrag löschen?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('pinnwand').delete().eq('id', id);
    if (error) alert(error.message);
    else reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text1">Schwarzes Brett</h1>
          <p className="text-text3 text-sm mt-1">Mitteilungen für das ganze Team.</p>
        </div>
        {canPost && (
          <button onClick={() => setOpen(true)} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold">
            + Neuer Beitrag
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="bg-bg1 border border-border1 rounded-xl text-text3 text-sm text-center py-8">
          Noch keine Beiträge.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <div key={p.id} className={`bg-bg1 border rounded-xl p-4 ${p.angeheftet ? 'border-accent' : 'border-border1'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {p.angeheftet && <span title="Angeheftet">📌</span>}
                    <h3 className="text-text1 font-semibold">{p.titel}</h3>
                  </div>
                  <div className="text-text2 text-sm mt-2 whitespace-pre-line">{p.inhalt}</div>
                  <div className="text-text3 text-[10px] mt-3">
                    von {p.ersteller?.vorname} {p.ersteller?.nachname} · {new Date(p.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {canPost && (
                  <button onClick={() => del(p.id)} className="text-xs text-[var(--red)] hover:underline">Löschen</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <NeuModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
    </div>
  );
}

function NeuModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [titel, setTitel] = useState('');
  const [inhalt, setInhalt] = useState('');
  const [angeheftet, setAngeheftet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('tenant_id, id').single();
    const { error } = await supabase.from('pinnwand').insert({
      tenant_id: profile?.tenant_id,
      titel, inhalt, angeheftet,
      created_by: profile?.id,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-lg">
        <h2 className="text-base font-bold text-text1 mb-4">Neuer Beitrag</h2>
        {error && <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">{error}</div>}
        <div className="space-y-3">
          <input required placeholder="Titel" value={titel} onChange={(e) => setTitel(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm" />
          <textarea required placeholder="Inhalt" value={inhalt} onChange={(e) => setInhalt(e.target.value)} rows={6}
            className="w-full px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-sm" />
          <label className="flex items-center gap-2 text-sm text-text2">
            <input type="checkbox" checked={angeheftet} onChange={(e) => setAngeheftet(e.target.checked)} />
            Anpinnen (oben festhalten)
          </label>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Abbrechen</button>
          <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Sende…' : 'Veröffentlichen'}
          </button>
        </div>
      </form>
    </div>
  );
}
