import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export async function MitarbeiterDashboard({ userId, vorname, mitarbeiterId }: {
  userId: string; vorname: string | null; mitarbeiterId: string | null;
}) {
  const supabase = await createClient();
  const heute = new Date().toISOString().slice(0, 10);
  const in14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  // Daten parallel laden
  const [
    { data: schichten },
    { data: aufgaben },
    { data: mitarbeiter },
    { data: pinnwand },
    { data: urlaub },
  ] = await Promise.all([
    mitarbeiterId
      ? supabase.from('einteilungen')
          .select('id, datum, von, bis, objekt:objekt_id(name, adresse)')
          .eq('mitarbeiter_id', mitarbeiterId)
          .gte('datum', heute).lte('datum', in14)
          .order('datum').order('von')
          .limit(10)
      : Promise.resolve({ data: [] as any[] }),
    mitarbeiterId
      ? supabase.from('aufgaben')
          .select('id, titel, beschreibung, faellig_am')
          .eq('mitarbeiter_id', mitarbeiterId)
          .eq('erledigt', false)
          .order('faellig_am')
          .limit(8)
      : Promise.resolve({ data: [] as any[] }),
    mitarbeiterId
      ? supabase.from('mitarbeiter')
          .select('jahresurlaub_tage, urlaubstage_genommen')
          .eq('id', mitarbeiterId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('pinnwand').select('id, titel, inhalt, created_at, angeheftet').order('angeheftet', { ascending: false }).order('created_at', { ascending: false }).limit(5),
    mitarbeiterId
      ? supabase.from('urlaube')
          .select('von, bis, typ, status')
          .eq('mitarbeiter_id', mitarbeiterId)
          .eq('status', 'genehmigt')
          .gte('von', heute)
          .order('von').limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const restUrlaub = mitarbeiter
    ? Math.max(0, (Number(mitarbeiter.jahresurlaub_tage) || 0) - (Number(mitarbeiter.urlaubstage_genommen) || 0))
    : null;

  const tageZuNaechstemUrlaub = urlaub
    ? Math.max(0, Math.ceil((new Date(urlaub.von + 'T00:00:00').getTime() - Date.now()) / 86400000))
    : null;

  const naechsteSchicht = schichten?.[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text1">Hallo, {vorname || 'willkommen'} 👋</h1>
        <p className="text-text3 text-sm">Dein Tag auf einen Blick.</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <QuickAction href="/abwesenheit?neu=krank" icon="🤒" label="Krank melden" tone="red" />
        <QuickAction href="/abwesenheit?neu=urlaub" icon="🏖️" label="Urlaub beantragen" tone="green" />
        <QuickAction href="/dienstplan" icon="📅" label="Meine Schichten" />
        <QuickAction href="/pinnwand" icon="📌" label="Schwarzes Brett" />
      </div>

      {/* Naechste Schicht prominent */}
      {naechsteSchicht && (
        <div className="bg-[var(--accent-dim2)] border border-accent rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wide text-accent font-bold">Nächste Schicht</div>
          <div className="text-text1 text-lg font-bold mt-1">
            {(naechsteSchicht.objekt as any)?.name ?? '—'}
          </div>
          <div className="text-text2 text-sm mt-0.5">
            {new Date(naechsteSchicht.datum + 'T12:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}
            {' · '}
            <span className="font-mono">{naechsteSchicht.von.slice(0, 5)}–{naechsteSchicht.bis.slice(0, 5)}</span>
          </div>
          {(naechsteSchicht.objekt as any)?.adresse && (
            <div className="text-text3 text-xs mt-1">📍 {(naechsteSchicht.objekt as any).adresse}</div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Aufgaben */}
        <Card title="Offene Aufgaben" countBadge={aufgaben?.length}>
          {!aufgaben?.length ? (
            <Empty>Keine offenen Aufgaben — gut gemacht!</Empty>
          ) : (
            <ul className="divide-y divide-border1 -mx-1">
              {aufgaben.map((a: any) => (
                <li key={a.id} className="py-2 px-1">
                  <div className="text-text1 text-sm font-medium">{a.titel}</div>
                  {a.beschreibung && <div className="text-text3 text-xs mt-0.5">{a.beschreibung}</div>}
                  {a.faellig_am && <div className="text-text3 text-[10px] mt-0.5">fällig {new Date(a.faellig_am + 'T12:00').toLocaleDateString('de-DE')}</div>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Urlaubskonto */}
        <Card title="Urlaubskonto">
          {!mitarbeiter ? (
            <Empty>Kein Mitarbeiterprofil verknüpft.</Empty>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-text1">{restUrlaub}</span>
                <span className="text-text3 text-sm">von {mitarbeiter.jahresurlaub_tage ?? 0} Tagen offen</span>
              </div>
              {tageZuNaechstemUrlaub != null && urlaub ? (
                <div className="mt-3 text-text2 text-sm">
                  🏖️ Nächster Urlaub in <strong>{tageZuNaechstemUrlaub} Tagen</strong> ({new Date(urlaub.von + 'T12:00').toLocaleDateString('de-DE')})
                </div>
              ) : (
                <div className="mt-3 text-text3 text-sm">Kein Urlaub geplant.</div>
              )}
              <Link href="/abwesenheit" className="inline-block mt-3 text-accent text-xs hover:underline">
                Urlaub beantragen →
              </Link>
            </>
          )}
        </Card>

        {/* Schwarzes Brett */}
        <Card title="Schwarzes Brett" className="md:col-span-2">
          {!pinnwand?.length ? (
            <Empty>Noch keine Beiträge.</Empty>
          ) : (
            <ul className="divide-y divide-border1 -mx-1">
              {pinnwand.map((p: any) => (
                <li key={p.id} className="py-2 px-1">
                  <div className="flex items-start gap-2">
                    {p.angeheftet && <span>📌</span>}
                    <div className="flex-1 min-w-0">
                      <div className="text-text1 text-sm font-semibold">{p.titel}</div>
                      <div className="text-text2 text-xs mt-0.5 line-clamp-2 whitespace-pre-line">{p.inhalt}</div>
                      <div className="text-text3 text-[10px] mt-1">{new Date(p.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label, tone }: { href: string; icon: string; label: string; tone?: 'red' | 'green' }) {
  const toneClass = tone === 'red'
    ? 'border-red-700 hover:bg-[var(--red-dim)]'
    : tone === 'green' ? 'border-green-700 hover:bg-[var(--green-dim)]'
    : 'border-border1 hover:bg-bg2';
  return (
    <Link href={href} className={`flex items-center gap-2 p-3 rounded-xl border bg-bg1 ${toneClass} transition-colors`}>
      <span className="text-xl">{icon}</span>
      <span className="text-text1 text-sm font-medium">{label}</span>
    </Link>
  );
}

function Card({ title, children, countBadge, className }: { title: string; children: React.ReactNode; countBadge?: number; className?: string }) {
  return (
    <div className={`bg-bg1 border border-border1 rounded-xl p-4 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-text1">{title}</div>
        {countBadge != null && countBadge > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-white font-bold">{countBadge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-text3 text-sm py-3 text-center">{children}</div>;
}
