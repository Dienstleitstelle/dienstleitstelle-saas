import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const heute = new Date().toISOString().slice(0, 10);

  const [{ count: maCount }, { count: objCount }, { data: heutigeEin }, { data: offUrlaub }] =
    await Promise.all([
      supabase.from('mitarbeiter').select('id', { count: 'exact', head: true }).eq('aktiv', true),
      supabase.from('objekte').select('id', { count: 'exact', head: true }).eq('aktiv', true),
      supabase
        .from('einteilungen')
        .select('id, von, bis, mitarbeiter:mitarbeiter_id(vorname, nachname), objekt:objekt_id(name)')
        .eq('datum', heute)
        .order('von'),
      supabase
        .from('urlaube')
        .select('id, von, bis, typ, mitarbeiter:mitarbeiter_id(vorname, nachname)')
        .eq('status', 'offen')
        .order('von'),
    ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text1">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Mitarbeiter aktiv" value={maCount ?? 0} />
        <Stat label="Objekte aktiv" value={objCount ?? 0} />
        <Stat label="Schichten heute" value={heutigeEin?.length ?? 0} />
        <Stat label="Offene Urlaubsanträge" value={offUrlaub?.length ?? 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Belegung heute">
          {!heutigeEin?.length ? (
            <Empty>Heute keine Schichten geplant.</Empty>
          ) : (
            <ul className="divide-y divide-border1">
              {heutigeEin.map((e: any) => (
                <li key={e.id} className="py-2 flex justify-between items-center text-sm">
                  <div>
                    <div className="text-text1 font-medium">
                      {e.mitarbeiter?.vorname} {e.mitarbeiter?.nachname}
                    </div>
                    <div className="text-text3 text-xs">{e.objekt?.name}</div>
                  </div>
                  <div className="text-text2 text-xs font-mono">
                    {e.von?.slice(0, 5)}–{e.bis?.slice(0, 5)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Offene Urlaubsanträge">
          {!offUrlaub?.length ? (
            <Empty>Keine offenen Anträge.</Empty>
          ) : (
            <ul className="divide-y divide-border1">
              {offUrlaub.map((u: any) => (
                <li key={u.id} className="py-2 flex justify-between text-sm">
                  <span className="text-text1">
                    {u.mitarbeiter?.vorname} {u.mitarbeiter?.nachname}
                  </span>
                  <span className="text-text3 text-xs">
                    {u.von} – {u.bis}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-bg1 border border-border1 rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wide text-text3 mb-1">{label}</div>
      <div className="text-2xl font-bold text-text1">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg1 border border-border1 rounded-xl p-4">
      <div className="text-sm font-semibold text-text1 mb-2">{title}</div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-text3 text-sm py-3 text-center">{children}</div>;
}
