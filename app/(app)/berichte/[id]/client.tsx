'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ZWECK_ICON: Record<string, string> = {
  uebergabe: '🤝', vorfall: '⚠️', wartung: '🔧', rundgang: '🚶',
  medikamente: '💊', postenbuch: '📓', auftraggeber: '📋', sonstiges: '📌',
};

export function BerichtDetailClient({ bericht, lesebestaetigungen, habeIchGelesen, userId }: {
  bericht: any; lesebestaetigungen: any[]; habeIchGelesen: boolean; userId: string;
}) {
  const router = useRouter();
  const [bestaetigt, setBestaetigt] = useState(habeIchGelesen);
  const [loading, setLoading] = useState(false);

  async function bestaetigen() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('berichts_lesebestaetigungen').insert({
      eintrag_id: bericht.id, user_id: userId,
    });
    setLoading(false);
    if (error) { alert(error.message); return; }
    setBestaetigt(true);
    router.refresh();
  }

  async function statusAendern(status: string) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('berichts_eintraege').update({
      status, bearbeitet_at: new Date().toISOString(), bearbeitet_von: userId,
    }).eq('id', bericht.id);
    setLoading(false);
    if (error) alert(error.message);
    else router.refresh();
  }

  function druckenAlsPDF() {
    window.print();
  }

  const felder = bericht.vorlage?.felder ?? [];
  const werte = bericht.werte ?? {};

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/berichte" className="text-text3 text-sm hover:text-text1">← Berichte</Link>
        <div className="flex gap-2">
          <button onClick={druckenAlsPDF} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">🖨 Drucken / PDF</button>
        </div>
      </div>

      <div className="bg-bg1 border border-border1 rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl">{ZWECK_ICON[bericht.vorlage?.zweck] ?? '📋'}</span>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text1">{bericht.vorlage?.name}</h1>
            <div className="text-text3 text-xs mt-1">
              {bericht.objekt?.name && <span>{bericht.objekt.name} · </span>}
              von {bericht.ersteller?.vorname} {bericht.ersteller?.nachname} · {new Date(bericht.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            {bericht.schweregrad && (
              <div className="text-[var(--amber)] text-sm mt-2 font-semibold">
                Schweregrad: {'⚠️'.repeat(bericht.schweregrad)} ({bericht.schweregrad}/5)
              </div>
            )}
          </div>
          <StatusSelect current={bericht.status} onChange={statusAendern} />
        </div>

        <div className="border-t border-border1 pt-4 space-y-3">
          {Object.entries(werte).length === 0 ? (
            <div className="text-text3 text-sm italic">Keine Werte erfasst.</div>
          ) : (
            felder.map((f: any, idx: number) => {
              const wert = werte[f.label];
              if (wert === undefined || wert === null || wert === '') return null;
              return (
                <div key={idx} className="grid grid-cols-3 gap-3 py-2 border-b border-border1/50">
                  <div className="text-text3 text-xs uppercase tracking-wide">{f.label}</div>
                  <div className="col-span-2 text-text1 text-sm whitespace-pre-line">
                    {Array.isArray(wert) ? wert.join(', ') : typeof wert === 'boolean' ? (wert ? 'Ja' : 'Nein') : String(wert)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Lesebestätigungen */}
      <div className="bg-bg1 border border-border1 rounded-xl p-4 print:hidden">
        <div className="text-text1 font-semibold text-sm mb-3">Lesebestätigungen ({lesebestaetigungen.length})</div>

        {!bestaetigt && (
          <button onClick={bestaetigen} disabled={loading}
            className="mb-4 w-full py-2.5 rounded-lg bg-[var(--green)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
            ✓ Ich habe diesen Bericht gelesen und zur Kenntnis genommen
          </button>
        )}
        {bestaetigt && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-[var(--green-dim)] text-[var(--green)] text-sm">
            ✓ Du hast diesen Bericht bereits bestätigt.
          </div>
        )}

        {lesebestaetigungen.length === 0 ? (
          <div className="text-text3 text-sm">Noch niemand hat den Bericht gelesen.</div>
        ) : (
          <ul className="divide-y divide-border1">
            {lesebestaetigungen.map((l: any) => (
              <li key={l.id} className="py-2 text-sm flex justify-between">
                <span className="text-text1">{l.user?.vorname} {l.user?.nachname}</span>
                <span className="text-text3 text-xs">{new Date(l.gelesen_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusSelect({ current, onChange }: { current: string; onChange: (s: string) => void }) {
  return (
    <select value={current} onChange={(e) => onChange(e.target.value)}
      className="text-xs px-2 py-1 rounded bg-bg2 border border-border1 text-text1">
      <option value="offen">Offen</option>
      <option value="in_bearbeitung">In Bearbeitung</option>
      <option value="erledigt">Erledigt</option>
      <option value="archiviert">Archiviert</option>
    </select>
  );
}
