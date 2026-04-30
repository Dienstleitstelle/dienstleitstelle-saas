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
interface Einladung {
  id: string; mitarbeiter_id: string | null; email: string;
  token: string; accepted_at: string | null; expires_at: string; rolle: Rolle;
}

const VERTRAG_BADGE: Record<MA['vertrag'], string> = {
  Vollzeit: 'bg-[var(--accent-dim2)] text-accent',
  Teilzeit: 'bg-[var(--green-dim)] text-[var(--green)]',
  Minijob:  'bg-[var(--amber-dim)] text-[var(--amber)]',
  Aushilfe: 'bg-bg3 text-text2',
};

interface InviteResultModal {
  inviteLink: string;
  email: string;
  vorname: string;
  nachname: string;
  istNeu: boolean; // gerade frisch erstellt
}

export function MitarbeiterClient({ initial, berufsgruppen, offeneEinladungen }: {
  initial: MA[]; berufsgruppen: Berufsgruppe[]; offeneEinladungen: Einladung[];
}) {
  const [list, setList] = useState<MA[]>(initial);
  const [invites, setInvites] = useState<Einladung[]>(offeneEinladungen);
  const [edit, setEdit] = useState<Partial<MA> | null>(null);
  const [filter, setFilter] = useState('');
  const [working, setWorking] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<InviteResultModal | null>(null);

  async function reload() {
    const supabase = createClient();
    const [{ data: m }, { data: i }] = await Promise.all([
      supabase.from('mitarbeiter').select('*').order('nachname'),
      supabase.from('invitations').select('id, mitarbeiter_id, email, token, accepted_at, expires_at, rolle').is('accepted_at', null),
    ]);
    setList((m ?? []) as MA[]);
    setInvites((i ?? []) as Einladung[]);
  }

  async function del(id: string) {
    if (!confirm('Mitarbeiter wirklich loeschen? Damit wird auch der Login-Account ggf. entkoppelt.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('mitarbeiter').delete().eq('id', id);
    if (error) alert(error.message);
    else reload();
  }

  async function einladen(ma: MA, rolle: Rolle = 'mitarbeiter') {
    if (!ma.email) { alert('Mitarbeiter hat keine E-Mail. Bitte erst eine E-Mail in den Stammdaten hinterlegen.'); return; }
    setWorking(ma.id);
    try {
      const res = await fetch('/api/mitarbeiter/einladen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mitarbeiter_id: ma.id, email: ma.email, vorname: ma.vorname, nachname: ma.nachname, rolle, sendMail: false }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data?.error ?? 'Fehler'); return; }
      setInviteResult({ inviteLink: data.invite_link, email: ma.email, vorname: ma.vorname, nachname: ma.nachname, istNeu: false });
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
  const inviteByMa = Object.fromEntries(invites.filter(i => i.mitarbeiter_id).map(i => [i.mitarbeiter_id!, i]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-text1">Mitarbeiter</h1>
          <p className="text-text3 text-sm mt-1">Beim Anlegen erstellst du automatisch einen Einladungslink, den du dem Mitarbeiter selbst (z.&nbsp;B. WhatsApp) schicken kannst.</p>
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
                <th className="text-left px-3 py-2">Login-Status</th>
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
                const inv = inviteByMa[m.id];
                const expired = inv ? new Date(inv.expires_at) < new Date() : false;
                let statusLabel = 'Kein Login';
                let statusCls = 'bg-bg3 text-text3';
                if (m.user_id) { statusLabel = 'Aktiv'; statusCls = 'bg-[var(--green-dim)] text-[var(--green)]'; }
                else if (inv && !expired) { statusLabel = 'Eingeladen'; statusCls = 'bg-[var(--amber-dim)] text-[var(--amber)]'; }
                else if (inv && expired) { statusLabel = 'Einladung abgelaufen'; statusCls = 'bg-[var(--red-dim)] text-[var(--red)]'; }

                const inviteLink = inv ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inv.token}` : null;

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
                      {inviteLink && !m.user_id && m.email && (
                        <button onClick={() => setInviteResult({ inviteLink, email: m.email!, vorname: m.vorname, nachname: m.nachname, istNeu: false })}
                          className="block text-[10px] text-accent mt-0.5 hover:underline">
                          Link anzeigen
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-text2 text-xs">{m.vorgesetzter_id ? maMap[m.vorgesetzter_id] ?? '-' : '-'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {!m.user_id && m.email && (
                        <button onClick={() => einladen(m)} disabled={working === m.id}
                          className="text-xs px-2 py-1 rounded border border-accent text-accent hover:bg-[var(--accent-dim2)] mr-1 disabled:opacity-50">
                          {working === m.id ? '...' : (inv ? 'Link generieren' : 'Einladen')}
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
          onSaved={(ergebnis) => {
            setEdit(null);
            reload();
            if (ergebnis) setInviteResult(ergebnis);
          }}
        />
      )}

      {inviteResult && (
        <InviteLinkModal {...inviteResult} onClose={() => setInviteResult(null)} />
      )}
    </div>
  );
}

function InviteLinkModal({ inviteLink, email, vorname, nachname, istNeu, onClose }:
  InviteResultModal & { onClose: () => void }
) {
  const [copied, setCopied] = useState(false);
  const fullName = `${vorname} ${nachname}`.trim() || email;
  const message = `Hi${vorname ? ' ' + vorname : ''}, ich habe dich zu unserer DienstLeitstelle eingeladen. Klick auf diesen Link, um deinen Account zu aktivieren: ${inviteLink}`;

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const phoneClean = (t: string) => t.replace(/[^+\d]/g, '');
  const wa = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const sms = `sms:?body=${encodeURIComponent(message)}`;
  const mail = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Dein Login fuer DienstLeitstelle')}&body=${encodeURIComponent(message)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-bg1 border border-border2 rounded-xl p-6 w-full max-w-lg">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-bold text-text1">
              {istNeu ? 'Mitarbeiter angelegt' : 'Einladungslink'}
            </h2>
            <p className="text-text3 text-xs mt-1">Fuer {fullName} ({email})</p>
          </div>
          <button onClick={onClose} className="text-text3 hover:text-text1">x</button>
        </div>

        <div className="rounded-lg bg-bg2 border border-border1 p-3">
          <Label>Einladungslink</Label>
          <div className="flex items-center gap-2 mt-1">
            <input readOnly value={inviteLink}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 px-2 py-2 rounded-lg bg-bg1 border border-border1 text-text1 text-xs font-mono outline-none" />
            <button onClick={() => copy(inviteLink)}
              className="px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold whitespace-nowrap">
              {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
          </div>
          <p className="text-[10px] text-text3 mt-2">Gueltig 7 Tage. Wer den Link hat, kann den Account aktivieren - bitte nur an die richtige Person geben.</p>
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
          <button onClick={() => copy(message)}
            className="w-full mt-2 px-3 py-2 rounded-lg border border-border2 text-text2 text-xs hover:text-text1">
            Komplette Nachricht kopieren
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
  onClose: () => void; onSaved: (invite?: InviteResultModal) => void;
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
  const [linkErzeugen, setLinkErzeugen] = useState(true);
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

    let inviteResult: InviteResultModal | undefined;

    if (istNeu && email && linkErzeugen) {
      try {
        const res = await fetch('/api/mitarbeiter/einladen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mitarbeiter_id: maId, email, vorname, nachname, rolle, sendMail: false }),
        });
        const j = await res.json();
        if (res.ok && j.invite_link) {
          inviteResult = {
            inviteLink: j.invite_link,
            email, vorname, nachname, istNeu: true,
          };
        }
      } catch { /* still navigate */ }
    }

    setLoading(false);
    onSaved(inviteResult);
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
            <Field label="E-Mail (fuer Login)" type="email" value={email} onChange={setEmail} />
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
              {berufsgruppen.length === 0 && (
                <p className="text-[10px] text-text3 mt-1">
                  Noch keine Berufsgruppen. <a href="/einstellungen/berufsgruppen" className="text-accent">Anlegen</a>.
                </p>
              )}
            </div>
            <div>
              <Label>Vertragsart</Label>
              <select value={vertrag} onChange={(e) => setVertrag(e.target.value as MA['vertrag'])} className={inputCls}>
                <option>Vollzeit</option>
                <option>Teilzeit</option>
                <option>Minijob</option>
                <option>Aushilfe</option>
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
            <p className="text-[10px] text-text3 mt-1">Erhaelt Antraege dieses Mitarbeiters.</p>
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
              <Label>Login-Einladung</Label>
              <label className="flex items-center gap-2 text-sm text-text2">
                <input type="checkbox" checked={linkErzeugen} onChange={(e) => setLinkErzeugen(e.target.checked)} disabled={!email}
                  className="w-4 h-4" />
                <span>Einladungslink erzeugen (du leitest ihn selbst weiter)</span>
              </label>
              {linkErzeugen && email && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Login-Rolle</Label>
                    <select value={rolle} onChange={(e) => setRolle(e.target.value as Rolle)} className={inputCls}>
                      <option value="mitarbeiter">Mitarbeiter</option>
                      <option value="leitung">Leitung</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <p className="col-span-2 text-[10px] text-text3 self-end">
                    Nach dem Speichern bekommst du einen Link zum Kopieren / per WhatsApp weiterleiten.
                  </p>
                </div>
              )}
              {!email && <p className="text-[10px] text-text3">E-Mail fehlt - kein Login moeglich.</p>}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border2 text-text2 text-sm">Abbrechen</button>
          <button type="submit" disabled={loading || !vorname || !nachname} className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Speichere...' : werte.id ? 'Aktualisieren' : (linkErzeugen && email ? 'Anlegen + Link erzeugen' : 'Anlegen')}
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
