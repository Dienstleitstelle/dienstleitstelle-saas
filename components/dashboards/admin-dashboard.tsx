import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export async function AdminDashboard({ vorname }: { vorname: string | null }) {
  const supabase = await createClient();
  const heute = new Date().toISOString().slice(0, 10);

  const [
    { count: maCount },
    { count: objCount },
    { count: bgCount },
    { data: heuteEin },
    { data: offUrlaub },
    { count: einladungenOffen },
  ] = await Promise.all([
    supabase.from('mitarbeiter').select('id', { count: 'exact', head: true }).eq('aktiv', true),
    supabase.from('objekte').select('id', { count: 'exact', head: true }).eq('aktiv', true),
    supabase.from('berufsgruppen').select('id', { count: 'exact', head: true }),
    supabase.from('einteilungen')
      .select('id, von, bis, mitarbeiter:mitarbeiter_id(vorname, nachname), objekt:objekt_id(name)')
      .eq('datum', heute).order('von'),
    supabase.from('urlaube')
      .select('id, mitarbeiter:mitarbeiter_id(vorname, nachname), von, bis, typ')
      .eq('status', 'offen').order('von').limit(8),
    supabase.from('invitations').select('id', { count: 'exact', head: true }).is('accepted_at', null),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text1">Hallo, {vorname || 'Admin'} 👋</h1>
        <p className="text-text3 text-sm">Verwaltung & Übersicht.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Mitarbeiter" value={maCount ?? 0} href="/mitarbeiter" />
        <Stat label="Objekte" value={objCount ?? 0} href="/objekte" />
        <Stat label="Berufsgruppen" value={bgCount ?? 0} href="/einstellungen/berufsgruppen" />
        <Stat label="Offene Einladungen" value={einladungenOffen ?? 0} href="/einladungen" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Heutige Schichten" badge={heuteEin?.length}>
          {!heuteEin?.length ? (
            <Empty>Heute keine Schichten geplant.</Empty>
          ) : (
            <ul className="divide-y divide-border1 -mx-1">
              {heuteEin.slice(0, 8).map((e: any) => (
                <li key={e.id} className="py-2 px-1 flex items-center justify-between">
                  <div>
                    <div className="text-text1 text-sm font-medium">{e.mitarbeiter?.vorname} {e.mitarbeiter?.nachname}</div>
                    <div className="text-text3 text-xs">{e.objekt?.name}</div>
                  </div>
                  <div className="text-text2 text-xs font-mono">{e.von?.slice(0, 5)}–{e.bis?.slice(0, 5)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Offene Anträge" badge={offUrlaub?.length}>
          {!offUrlaub?.length ? (
            <Empty>Keine offenen Anträge.</Empty>
          ) : (
            <ul className="divide-y divide-border1 -mx-1">
              {offUrlaub.map((u: any) => (
                <li key={u.id} className="py-2 px-1">
                  <div className="text-text1 text-sm">{u.mitarbeiter?.vorname} {u.mitarbeiter?.nachname}</div>
                  <div className="text-text3 text-xs">{u.typ} · {u.von} – {u.bis}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className="bg-bg1 border border-border1 rounded-xl p-3 hover:border-accent transition-colors">
      <div className="text-[10px] uppercase tracking-wide text-text3">{label}</div>
      <div className="text-2xl font-bold text-text1 mt-0.5">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Card({ title, children, badge }: { title: string; children: React.ReactNode; badge?: number }) {
  return (
    <div className="bg-bg1 border border-border1 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-text1">{title}</div>
        {badge != null && badge > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-white font-bold">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-text3 text-sm py-3 text-center">{children}</div>;
}
