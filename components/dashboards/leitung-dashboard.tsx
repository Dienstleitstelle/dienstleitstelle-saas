import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export async function LeitungDashboard({ userId, vorname }: { userId: string; vorname: string | null }) {
  const supabase = await createClient();
  const heute = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  // Mein Team finden: alle MA, deren Vorgesetzter ich bin
  // Schritt 1: meine eigene mitarbeiter_id (falls verknuepft)
  const { data: meinProfile } = await supabase
    .from('profiles')
    .select('mitarbeiter_id')
    .eq('id', userId)
    .maybeSingle();
  const meineMaId = meinProfile?.mitarbeiter_id;

  let meinTeamIds: string[] = [];
  if (meineMaId) {
    const { data: team } = await supabase
      .from('mitarbeiter')
      .select('id')
      .eq('vorgesetzter_id', meineMaId);
    meinTeamIds = (team ?? []).map(t => t.id);
  }
  // Falls keine MA-Verknuepfung: alle MA (Leitung sieht alles)
  if (!meineMaId) {
    const { data: alle } = await supabase.from('mitarbeiter').select('id');
    meinTeamIds = (alle ?? []).map(a => a.id);
  }

  const [{ data: urlaubsAntraege }, { data: stornoAnfragen }, { data: vakante }, { data: vertretungen }] = await Promise.all([
    meinTeamIds.length
      ? supabase.from('urlaube')
          .select('id, von, bis, typ, tage, mitarbeiter:mitarbeiter_id(vorname, nachname)')
          .in('mitarbeiter_id', meinTeamIds)
          .eq('status', 'offen')
          .order('von')
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('stornierungs_anfragen')
      .select('id, grund, created_at')
      .eq('status', 'offen').order('created_at', { ascending: false }).limit(5),
    supabase.from('einteilungen')
      .select('datum, von, bis, objekt:objekt_id(name)')
      .gte('datum', heute).lte('datum', in30).order('datum').limit(50),
    supabase.from('vertretungen')
      .select('id, von, bis, vertreter:vertreter_id(id), notiz')
      .eq('vertretene_id', userId)
      .gte('bis', heute)
      .order('von'),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-text1">Hallo, {vorname || 'willkommen'} 👋</h1>
          <p className="text-text3 text-sm">Was braucht heute deine Aufmerksamkeit.</p>
        </div>
        <Link href="/vertretung"
          className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm hover:text-text1">
          🪑 Vertretung verwalten {vertretungen?.length ? `(${vertretungen.length})` : ''}
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Offene Urlaubsanträge" value={urlaubsAntraege?.length ?? 0} href="/abwesenheit" />
        <Stat label="Stornierungs-Anfragen" value={stornoAnfragen?.length ?? 0} />
        <Stat label="Schichten 30 Tage" value={vakante?.length ?? 0} href="/dienstplan" />
        <Stat label="Mein Team" value={meinTeamIds.length} href="/mitarbeiter" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Offene Urlaubsanträge meines Teams" badge={urlaubsAntraege?.length}>
          {!urlaubsAntraege?.length ? (
            <Empty>Keine offenen Anträge.</Empty>
          ) : (
            <ul className="divide-y divide-border1 -mx-1">
              {urlaubsAntraege.slice(0, 8).map((u: any) => (
                <li key={u.id} className="py-2 px-1 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-text1 text-sm font-medium">{u.mitarbeiter?.vorname} {u.mitarbeiter?.nachname}</div>
                    <div className="text-text3 text-xs">
                      {u.typ} · {new Date(u.von + 'T12:00').toLocaleDateString('de-DE')} – {new Date(u.bis + 'T12:00').toLocaleDateString('de-DE')} ({u.tage} Tage)
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Genehmigen id={u.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Stornierungs-Anfragen" badge={stornoAnfragen?.length}>
          {!stornoAnfragen?.length ? (
            <Empty>Keine offenen Anfragen.</Empty>
          ) : (
            <ul className="divide-y divide-border1 -mx-1">
              {stornoAnfragen.map((s: any) => (
                <li key={s.id} className="py-2 px-1">
                  <div className="text-text2 text-sm">{s.grund}</div>
                  <div className="text-text3 text-[10px] mt-0.5">{new Date(s.created_at).toLocaleDateString('de-DE')}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Aktive Vertretung" className="md:col-span-2">
          {!vertretungen?.length ? (
            <Empty>Keine aktive Vertretung. <Link href="/vertretung" className="text-accent">Vertretung definieren</Link></Empty>
          ) : (
            <ul className="space-y-2">
              {vertretungen.map((v: any) => (
                <li key={v.id} className="text-sm text-text2">
                  Vertretung von <strong className="text-text1">{new Date(v.von + 'T12:00').toLocaleDateString('de-DE')}</strong> bis <strong className="text-text1">{new Date(v.bis + 'T12:00').toLocaleDateString('de-DE')}</strong>
                  {v.notiz && <span className="text-text3 ml-2">({v.notiz})</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Genehmigen({ id }: { id: string }) {
  // Server component kann nicht onClick - Link auf abwesenheit-Seite
  return (
    <Link href={`/abwesenheit#${id}`} className="text-xs text-accent hover:underline">
      Bearbeiten →
    </Link>
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

function Card({ title, children, badge, className }: { title: string; children: React.ReactNode; badge?: number; className?: string }) {
  return (
    <div className={`bg-bg1 border border-border1 rounded-xl p-4 ${className ?? ''}`}>
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
