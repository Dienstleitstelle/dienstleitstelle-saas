import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const minsAusZeit = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const dauerH = (von: string, bis: string, pause: number = 0) => {
  let d = minsAusZeit(bis) - minsAusZeit(von);
  if (d < 0) d += 1440;
  return Math.max(0, (d - pause) / 60);
};

export default async function StatistikenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('rolle').eq('id', user.id).maybeSingle();
  if (!profile || (profile.rolle !== 'admin' && profile.rolle !== 'leitung')) redirect('/dashboard');

  const heute = new Date();
  const monatStart = new Date(heute.getFullYear(), heute.getMonth(), 1).toISOString().slice(0, 10);
  const vor30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const heuteStr = heute.toISOString().slice(0, 10);

  const [
    { data: einteilungenMonat },
    { data: zeitenMonat },
    { data: urlaube30 },
    { data: ma },
    { data: objekte },
    { data: berichte30 },
    { data: krankheiten30 },
  ] = await Promise.all([
    supabase.from('einteilungen').select('mitarbeiter_id, objekt_id, von, bis, datum').gte('datum', monatStart),
    supabase.from('zeiten').select('mitarbeiter_id, von, bis, pause_min').gte('datum', monatStart),
    supabase.from('urlaube').select('typ, status, tage, mitarbeiter_id').gte('von', vor30),
    supabase.from('mitarbeiter').select('id, vorname, nachname, lohn_pro_stunde').eq('aktiv', true),
    supabase.from('objekte').select('id, name').eq('aktiv', true),
    supabase.from('berichts_eintraege').select('id, schweregrad, status, created_at').gte('created_at', vor30),
    supabase.from('urlaube').select('mitarbeiter_id, tage').eq('typ', 'krank').gte('von', vor30),
  ]);

  // Stunden pro MA
  const stundenProMa: Record<string, number> = {};
  for (const z of zeitenMonat ?? []) {
    const h = dauerH(z.von, z.bis, z.pause_min || 0);
    stundenProMa[z.mitarbeiter_id] = (stundenProMa[z.mitarbeiter_id] || 0) + h;
  }
  for (const e of einteilungenMonat ?? []) {
    const h = dauerH(e.von, e.bis);
    if (!zeitenMonat?.length) {
      stundenProMa[e.mitarbeiter_id] = (stundenProMa[e.mitarbeiter_id] || 0) + h;
    }
  }

  const maMap = Object.fromEntries((ma ?? []).map((m: any) => [m.id, m]));
  const stundenListe = Object.entries(stundenProMa)
    .map(([id, h]) => ({ ma: maMap[id], stunden: h, lohn: (Number(maMap[id]?.lohn_pro_stunde) || 0) * h }))
    .filter(x => x.ma)
    .sort((a, b) => b.stunden - a.stunden);

  const summeStunden = stundenListe.reduce((s, x) => s + x.stunden, 0);
  const summeLohn = stundenListe.reduce((s, x) => s + x.lohn, 0);

  // Auslastung pro Objekt (Summe geplante Stunden im Monat)
  const objMap = Object.fromEntries((objekte ?? []).map((o: any) => [o.id, o.name]));
  const objStunden: Record<string, number> = {};
  for (const e of einteilungenMonat ?? []) {
    const h = dauerH(e.von, e.bis);
    objStunden[e.objekt_id] = (objStunden[e.objekt_id] || 0) + h;
  }
  const objListe = Object.entries(objStunden)
    .map(([id, h]) => ({ name: objMap[id] ?? '?', stunden: h }))
    .sort((a, b) => b.stunden - a.stunden);
  const maxObj = Math.max(1, ...objListe.map(o => o.stunden));

  // Krankenstand
  const krankTage = (krankheiten30 ?? []).reduce((s: number, k: any) => s + Number(k.tage || 0), 0);
  const aktiveMa = (ma ?? []).length;
  const krankenstandProz = aktiveMa > 0 ? (krankTage / (aktiveMa * 30)) * 100 : 0;

  // Urlaubsanträge
  const offUrlaub = (urlaube30 ?? []).filter((u: any) => u.status === 'offen').length;
  const genehmigteUrlaub = (urlaube30 ?? []).filter((u: any) => u.status === 'genehmigt').length;

  // Vorfälle
  const offVorfaelle = (berichte30 ?? []).filter((b: any) => b.status === 'offen').length;
  const kritisch = (berichte30 ?? []).filter((b: any) => b.schweregrad >= 4).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text1">Statistiken</h1>
        <p className="text-text3 text-sm mt-1">Letzte 30 Tage / aktueller Monat. Stand: {new Date().toLocaleString('de-DE')}.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Stunden im Monat" value={summeStunden.toFixed(1)} hint="Gesamt geplant + erfasst" />
        <Stat label="Lohnkosten brutto" value={'€ ' + summeLohn.toFixed(2)} hint="Anhand hinterl. Stundenlohn" />
        <Stat label="Krankenstand 30T" value={krankenstandProz.toFixed(1) + ' %'} hint={`${krankTage} Krankheitstage`} />
        <Stat label="Offene Anträge" value={offUrlaub} hint={`${genehmigteUrlaub} genehmigt`} />
        <Stat label="Aktive Mitarbeiter" value={aktiveMa} />
        <Stat label="Aktive Objekte" value={(objekte ?? []).length} />
        <Stat label="Vorfälle 30T" value={(berichte30 ?? []).length} hint={`${kritisch} kritisch`} />
        <Stat label="Offene Vorfälle" value={offVorfaelle} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Top 10 Mitarbeiter — Stunden im Monat">
          {stundenListe.length === 0 ? (
            <Empty>Keine Daten.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {stundenListe.slice(0, 10).map((x, i) => (
                <li key={i}>
                  <div className="flex justify-between text-sm">
                    <span className="text-text2">{x.ma.vorname} {x.ma.nachname}</span>
                    <span className="text-text1 font-semibold">{x.stunden.toFixed(1)} h</span>
                  </div>
                  <div className="h-1.5 bg-bg3 rounded mt-0.5 overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${Math.min(100, (x.stunden / Math.max(1, stundenListe[0].stunden)) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Auslastung pro Objekt — Stunden im Monat">
          {objListe.length === 0 ? (
            <Empty>Keine Daten.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {objListe.map((o, i) => (
                <li key={i}>
                  <div className="flex justify-between text-sm">
                    <span className="text-text2 truncate">{o.name}</span>
                    <span className="text-text1 font-semibold">{o.stunden.toFixed(1)} h</span>
                  </div>
                  <div className="h-1.5 bg-bg3 rounded mt-0.5 overflow-hidden">
                    <div className="h-full bg-[var(--green)]" style={{ width: `${(o.stunden / maxObj) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-text3 text-xs">
        Lohnkosten‑Berechnung ist eine Schätzung anhand des hinterlegten Stundenlohns. Tatsächliche Lohnabrechnung erfolgt durch deine Lohnbuchhaltung.
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-bg1 border border-border1 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wide text-text3">{label}</div>
      <div className="text-2xl font-bold text-text1 mt-0.5">{value}</div>
      {hint && <div className="text-[10px] text-text3 mt-0.5">{hint}</div>}
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg1 border border-border1 rounded-xl p-4">
      <div className="text-sm font-semibold text-text1 mb-3">{title}</div>
      {children}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-text3 text-sm py-3 text-center">{children}</div>;
}
