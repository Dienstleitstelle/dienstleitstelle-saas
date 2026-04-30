'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Rolle = 'admin' | 'leitung' | 'mitarbeiter';

interface MA {
  id: string; vorname: string; nachname: string;
  email: string | null; telefon: string | null; position: string | null;
  vertrag: 'Vollzeit' | 'Teilzeit' | 'Minijob' | 'Aushilfe';
  qualifikation: string | null;
  berufsgruppe_id: string | null;
  vorgesetzter_id: string | null;
  eintrittsdatum: string | null;
  jahresurlaub_tage: number | null;
  lohn_pro_stunde: number | null;
  user_id: string | null;
  aktiv: boolean;
}
interface Berufsgruppe { id: string; name: string }

const VERTRAG_BADGE: Record<MA['vertrag'], string> = {
  Vollzeit: 'bg-[var(--accent-dim2)] text-accent',
  Teilzeit: 'bg-[var(--green-dim)] text-[var(--green)]',
  Minijob:  'bg-[var(--amber-dim)] text-[var(--amber)]',
  Aushilfe: 'bg-bg3 text-text2',
};

interface AccountResult {
  email: string;
  password: string;
  vorname: string;
  nachname: string;
  istNeu: boolean; // gerade angelegt vs zurueckgesetzt
}

// einfacher gut merkbarer Passwort-Generator: Adjektiv-Tier-Zahl
const adjektive = ['stark','schnell','klar','tapfer','sicher','klug','ruhig','warm','frei','fair'];
const tiere = ['Adler','Loewe','Wolf','Fuchs','Tiger','Baer','Falke','Eule','Hai','Pferd'];
function genPasswort() {
  const a = adjektive[Math.floor(Math.random() * adjektive.length)];
  const t = tiere[Math.floor(Math.random() * tiere.length)];
  const z = Math.floor(Math.random() * 90 + 10);
  return `${a}-${t}-${z}`;
}

export function MitarbeiterClient({ initial, berufsgruppen }: {
  initial: MA[]; berufsgruppen: Berufsgruppe[]; offeneEinladungen?: any;
}) {
  const [list, setList] = useState<MA[]>(initial);
  const [edit, setEdit] = useState<Partial<MA> | null>(null);
  const [filter, setFilter] = useState('');
  const [working, setWorking] = useState<string | null>(null);
  const [accountResult, setAccountResult] = useState<AccountResult | null>(null);

  async function reload() {
    const supabase = createClient();
    const { data: m } = await supabase.from('mitarbeiter').select('*').order('nachname');
    setList((m ?? []) as MA[]);
  }

  async function del(id: string) {
    if (!confirm('Mitarbeiter wirklich loeschen? Damit wird auch der Login-Account ggf. entkoppelt.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('mitarbeiter').delete().eq('id', id);
    if (error) alert(error.message);
    else reload();
  }

  async function passwortZuruecksetzen(ma: MA, rolle: Rolle = 'mitarbeiter') {
    if (!ma.email) { alert('Mitarbeiter hat keine E-Mail. Bitte erst eine E-Mail in den Stammdaten hinterlegen.'); return; }
    const neuesPasswort = genPasswort();
    if (!confirm(`Neues Passwort fuer ${ma.vorname} ${ma.nachname} setzen? Das alte Passwort wird ueberschrieben.`)) return;
    setWorking(ma.id);
    try {
      const res = await fetch('/api/mitarbeiter/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mitarbeiter_id: ma.id, email: ma.email, vorname: ma.vorname, nachname: ma.nachname, rolle, password: neuesPasswort }),
      });
      const j = await res.json();
      if (!res.ok) { alert(j?.error ?? 'Fehler'); return; }
      setAccountResult({ email: j.email, password: j.password, vorname: ma.vorname, nachname: ma.nachname, istNeu: j.action === 'created' });
      reload();
    } finally { setWorking(null); }
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
        <div>
          <h1 className="text-xl font-bold text-text1">Mitarbeiter</h1>
          <p className="text-text3 text-sm mt-1">Beim Anlegen mit E-Mail + Passwort wird sofort ein Login-Account erstellt. Du gibst dem Mitarbeiter die Zugangsdaten persoenlich weiter (z.&nbsp;B. WhatsApp).</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Suchen..."
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
                <th className="text-left px-3 py-2">Login</th>
                <th className="text-left px-3 py-2">Vorgesetzter</th>
                <th className="text-right px-3 py-2">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {gefiltert.length === 0 && (
                <tr><td colSpan={7} className="text-center text-text3 py-6 text-sm">
                  {list.length === 0 ? 'Noch keine Mitarbeiter angelegt.' : 'Kein Treffer.'}
                </td></tr>
              )}
              {gefiltert.map((m) => {
                const hasAccount = !!m.user_id;
                const statusLabel = hasAccount ? 'Aktiv' : (m.email ? 'Kein Account' : 'Keine E-Mail');
                const statusCls = hasAccount
                  ? 'bg-[var(--green-dim)] text-[var(--green)]'
                  : (m.email ? 'bg-bg3 text-text3' : 'bg-bg3 text-text3');

                return (
                  <tr key={m.id} className="border-t border-border1 hover:bg-bg2">
                    <td className="px-3 py-2 text-text1 font-medium">
                      {m.vorname} {m.nachname}
                      {m.email && <div className="text-[10px] text-text3">{m.email}</div>}
                    </td>
                    <td className="px-3 py-2 text-text2">{m.position ?? '-'}</td>
                    <td className="px-3 py-2 text-text2">{m.berufsgruppe_id ? bgMap[m.berufsgruppe_id] ?? '-' : '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${VERTRAG_BADGE[m.vertrag]}`}>{m.vertrag}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusCls}`}>{statusLabel}</span>
                    </td>
                    <td className="px-3 py-2 text-text2 text-xs">{m.vorgesetzter_id ? maMap[m.vorgesetzter_id] ?? '-' : '-'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {m.email && (
                        <button onClick={() => passwortZuruecksetzen(m)} disabled={working === m.id}
                          className="text-xs px-2 py-1 rounded border border-accent text-accent hover:bg-[var(--accent-dim2)] mr-1 disabled:opacity-50">
                          {working === m.id ? '...' : (hasAccount ? 'Passwort neu' : 'Account anlegen')}
                        </button>
                      )}
                      <button onClick={() => setEdit(m)} className="text-xs px-2 py-1 rounded border border-border2 text-text2 hover:text-text1 mr-1">Bearbeiten</button>
                      <button onClick={() => del(m.id)} className="text-xs px-2 py-1 rounded border border-red-700 text-[var(--red)]">Loeschen</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <MaModal werte={edit} berufsgruppen={berufsgruppen} alleMa={list}
          onClose={() => setEdit(null)}
          onSaved={(ergebnis) => { setEdit(null); reload(); if (ergebnis) setAccountResult(ergebnis); }}
        />
      )}

      {accountResult && (
        <AccountModal {...accountResult} onClose={() => setAccountResult(null)} />
      )}
    </div>
  );
}

function AccountModal({ email, password, vorname, nachname, istNeu, onClose }:
  AccountResult & { onClose: () => void }
) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const fullName = `${vorname} ${nachname}`.trim() || email;

  const message =
`Hi${vorname ? ' ' + vorname : ''}, hier sind deine Zugangsdaten fuer die DienstLeitstelle:

Login-URL: https://dienstleitstelle-saas.vercel.app/login
E-Mail: ${email}
Passwort: ${password}

Bitte aendere das Passwort nach dem ersten Login (oben rechts auf deinen Namen klicken -> Passwort aendern).`;

  function copy(text: string, setter: (b: boolean) => void) {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 1500);
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const sms = `sms:?body=${encodeURIComponent(message)}`;
  const mail = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Deine Zugangsdaten')}&body=${encodeURIComponent(message)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-lg">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-bold text-text1">
              {istNeu ? 'Account angelegt' : 'Passwort zurueckgesetzt'}
            </h2>
            <p className="text-text3 text-xs mt-1">Fuer {fullName}</p>
          </div>
          <button onClick={onClose} className="text-text3 hover:text-text1">x</button>
        </div>

        <div className="rounded-lg bg-bg2 border border-border1 p-3 space-y-3">
          <div>
            <Label>E-Mail (Login-Name)</Label>
            <div className="flex items-center gap-2 mt-1">
              <input readOnly value={email} onFocus={(e) => e.currentTarget.select()}
                className="flex-1 px-2 py-2 rounded-lg bg-bg1 border border-border1 text-text1 text-sm font-mono outline-none" />
              <button onClick={() => copy(email, setCopiedEmail)}
                className="px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold whitespace-nowrap">
                {copiedEmail ? 'OK' : 'Kopieren'}
              </button>
            </div>
          </div>
          <div>
            <Label>Passwort</Label>
            <div className="flex items-center gap-2 mt-1">
              <input readOnly value={password} onFocus={(e) => e.currentTarget.select()}
                className="flex-1 px-2 py-2 rounded-lg bg-bg1 border border-border1 text-text1 text-sm font-mono outline-none" />
              <button onClick={() => copy(password, setCopiedPw)}
                className="px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold whitespace-nowrap">
                {copiedPw ? 'OK' : 'Kopieren'}
              </button>
            </div>
            <p className="text-[10px] text-text3 mt-1">Bitte vom Mitarbeiter nach dem ersten Login aendern lassen.</p>
          </div>
        </div>

        <div className="mt-4">
          <Label>So weiterleiten</Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg bg-[var(--green-dim)] text-[var(--green)] text-xs font-semibold text-center hover:opacity-90">
              WhatsApp
            </a>
            <a href={sms}
              className="px-3 py-2 rounded-lg bg-[var(--accent-dim2)] text-accent text-xs font-semibold text-center hover:opacity-90">
              SMS
            </a>
            <a href={mail}
              className="px-3 py-2 rounded-lg bg-bg2 border border-border1 text-text1 text-xs font-semibold text-center hover:bg-bg3">
              E-Mail
            </a>
          </div>
          <button onClick={() => copy(message, setCopiedAll)}
            className="w-full mt-2 px-3 py-2 rounded-lg border border-border2 text-text2 text-xs hover:text-text1">
            {copiedAll ? 'Komplette Nachricht kopiert!' : 'Komplette Nachricht kopieren'}
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold">
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}

function MaModal({ werte, berufsgruppen, alleMa, onClose, onSaved }: {
  werte: Partial<MA>; berufsgruppen: Berufsgruppe[]; alleMa: MA[];
  onClose: () => void; onSaved: (acc?: AccountResult) => void;
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
  const [rolle, setRolle] = useState<Rolle>('mitarbeiter');
  const [accountAnlegen, setAccountAnlegen] = useState(true);
  const [passwort, setPasswort] = useState(genPasswort());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const istNeu = !werte.id;
  const vorgesetzteOptionen = alleMa.filter(m => m.id !== werte.id);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const supabase = createClient();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
    const payload: any = {
      tenant_id: profile?.tenant_id,
      vorname, nachname,
      email: email || null, telefon: telefon || null,
      position: position || null, vertrag,
      qualifikation: qualifikation || null,
      berufsgruppe_id: berufsgruppeId || null,
      vorgesetzter_id: vorgesetzterId || null,
      eintrittsdatum: eintrittsdatum || null,
      jahresurlaub_tage: jahresurlaubTage === '' ? null : Number(jahresurlaubTage),
      lohn_pro_stunde: lohnProStunde === '' ? null : Number(lohnProStunde),
    };

    let maId = werte.id;
    if (werte.id) {
      const { error } = await supabase.from('mitarbeiter').update(payload).eq('id', werte.id);
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { data, error } = await supabase.from('mitarbeiter').insert(payload).select('id').single();
      if (error) { setError(error.message); setLoading(false); return; }
      maId = data.id;
    }

    let accountResult: AccountResult | undefined;

    if (istNeu && email && accountAnlegen) {
      try {
        const res = await fetch('/api/mitarbeiter/account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mitarbeiter_id: maId, email, vorname, nachname, rolle, password: passwort }),
        });
        const j = await res.json();
        if (!res.ok) {
          setError('Mitarbeiter angelegt, aber Account-Anlage fehlgeschlagen: ' + (j?.error ?? 'unbekannt'));
          setLoading(false);
          return;
        }
        accountResult = { email: j.email, password: j.password, vorname, nachname, istNeu: j.action === 'created' };
      } catch (err: any) {
        setError('Mitarbeiter angelegt. Account-Anlage fehlgeschlagen: ' + err?.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onSaved(accountResult);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-bold text-text1 mb-4">{werte.id ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}</h2>
        {error && <div className="rounded border border-red-700 bg-[var(--red-dim)] text-[var(--red)] p-2 text-xs mb-3">{error}</div>}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Vorname" required value={vorname} onChange={setVorname} />
            <Field label="Nachname" required value={nachname} onChange={setNachname} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="E-Mail (Login)" type="email" value={email} onChange={setEmail} />
            <Field label="Telefon" value={telefon} onChange={setTelefon} />
          </div>
          <Field label="Position" value={position} onChange={setPosition} placeholder="z. B. Sicherheitsmitarbeiter" />
          <Field label="Qualifikation/Notiz" value={qualifikation} onChange={setQualifikation} />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Berufsgruppe</Label>
              <select value={berufsgruppeId} onChange={(e) => setBerufsgruppeId(e.target.value)} className={inputCls}>
                <option value="">- keine -</option>
                {berufsgruppen.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Vertragsart</Label>
              <select value={vertrag} onChange={(e) => setVertrag(e.target.value as MA['vertrag'])} className={inputCls}>
                <option>Vollzeit</option><option>Teilzeit</option><option>Minijob</option><option>Aushilfe</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Vorgesetzter</Label>
            <select value={vorgesetzterId} onChange={(e) => setVorgesetzterId(e.target.value)} className={inputCls}>
              <option value="">- direkt der Geschaeftsfuehrung unterstellt -</option>
              {vorgesetzteOptionen.map(m => (
                <option key={m.id} value={m.id}>{m.vorname} {m.nachname}{m.position ? ' - ' + m.position : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Eintrittsdatum</Label>
              <input type="date" value={eintrittsdatum} onChange={(e) => setEintrittsdatum(e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label>Jahresurlaub (Tage)</Label>
              <input type="number" min={0} step={0.5} value={jahresurlaubTage} onChange={(e) => setJahresurlaubTage(e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label>Stundenlohn (EUR)</Label>
              <input type="number" min={0} step={0.01} value={lohnProStunde} onChange={(e) => setLohnProStunde(e.target.value)} className={inputCls} />
            </div>
          </div>

          {istNeu && (
            <div className="rounded-lg bg-bg2 border border-border1 p-3 space-y-2">
              <Label>Login-Account</Label>
              <label className="flex items-center gap-2 text-sm text-text2">
                <input type="checkbox" checked={accountAnlegen} onChange={(e) => setAccountAnlegen(e.target.checked)} disabled={!email}
                  className="w-4 h-4" />
                <span>Login-Account direkt anlegen</span>
              </label>
              {accountAnlegen && email && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Login-Rolle</Label>
                      <select value={rolle} onChange={(e) => setRolle(e.target.value as Rolle)} className={inputCls}>
                        <option value="mitarbeiter">Mitarbeiter</option>
                        <option value="leitung">Leitung</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <Label>Initial-Passwort</Label>
                      <div className="flex gap-1">
                        <input value={passwort} onChange={(e) => setPasswort(e.target.value)} className={inputCls} />
                        <button type="button" onClick={() => setPasswort(genPasswort())}
                          className="px-2 py-1 rounded border border-border2 text-text3 text-[10px]" title="Neues Passwort generieren">
                          neu
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-text3">Zugangsdaten werden dir nach dem Speichern angezeigt - du leitest sie selbst weiter (z. B. WhatsApp).</p>
                </>
              )}
              {!email && <p className="text-[10px] text-text3">E-Mail fehlt - kein Login moeglich.</p>}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Abbrechen</button>
          <button type="submit" disabled={loading || !vorname || !nachname} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Speichere...' : werte.id ? 'Aktualisieren' : (accountAnlegen && email ? 'Anlegen + Account' : 'Anlegen')}
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
function Field({ label, value, onChange, type = 'text', required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </label>
  );
}
