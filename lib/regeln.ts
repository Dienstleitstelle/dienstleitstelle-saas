/**
 * Regel-Engine
 * Prueft eine geplante Schicht gegen die vom Unternehmen hinterlegten Regeln.
 * Keine juristischen Texte, keine Paragraphen - nur konfigurierbare Werte.
 *
 * Regeln werden spaeter pro Unternehmen / Berufsgruppe in der Datenbank gepflegt.
 * Hier ist die generische Auswertung.
 */

export interface Regelwerk {
  /** Maximale Schichtdauer in Stunden (ohne Pause). 0 = nicht aktiv. */
  maxStundenProTag?: number;
  /** Pause ab Schichtdauer X (Stunden) -> mind. Y Minuten. */
  pauseSchwellen?: { abStunden: number; minMinuten: number }[];
  /** Mindestruhezeit zwischen zwei Schichten in Stunden. 0 = nicht aktiv. */
  minRuhezeitStunden?: number;
  /** Maximale Wochenstunden. 0 = nicht aktiv. */
  maxWochenstunden?: number;
  /** Sonntagsarbeit erlaubt? */
  sonntagErlaubt?: boolean;
  /** Maximale Stunden pro Monat (z.B. fuer Minijob-Toleranz). 0 = nicht aktiv. */
  maxStundenProMonat?: number;
}

export interface Schicht {
  von: string;          // "07:00"
  bis: string;          // "15:00"
  datum: string;        // "2026-04-29"
}

export interface Pruefkontext {
  schicht: Schicht;
  /** Andere Einteilungen desselben Mitarbeiters (fuer Ruhezeit + Wochen-/Monatssumme) */
  andereEinteilungen: { datum: string; von: string; bis: string }[];
}

export interface Pruefergebnis {
  ok: boolean;          // Keine harte Sperre
  hinweise: string[];   // Soft-Warnungen
  sperren: string[];    // Harte Verstoesse, die einplanen blockieren
}

export const minsAusZeit = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const dauerInMinuten = (von: string, bis: string): number => {
  let d = minsAusZeit(bis) - minsAusZeit(von);
  if (d < 0) d += 1440;
  return d;
};

const formatStunden = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

export function pruefeSchicht(ctx: Pruefkontext, regeln: Regelwerk): Pruefergebnis {
  const hinweise: string[] = [];
  const sperren: string[] = [];

  const dauerMin = dauerInMinuten(ctx.schicht.von, ctx.schicht.bis);
  const dauerH = dauerMin / 60;

  // Maximale Schichtdauer
  if (regeln.maxStundenProTag && regeln.maxStundenProTag > 0) {
    if (dauerH > regeln.maxStundenProTag) {
      sperren.push(
        `Schichtdauer ${formatStunden(dauerMin)} ueberschreitet die Regel "Maximale Schichtdauer pro Tag" (${regeln.maxStundenProTag} h).`
      );
    }
  }

  // Pause
  if (regeln.pauseSchwellen && regeln.pauseSchwellen.length > 0) {
    const sortiert = [...regeln.pauseSchwellen].sort((a, b) => b.abStunden - a.abStunden);
    for (const stufe of sortiert) {
      if (dauerH >= stufe.abStunden) {
        hinweise.push(
          `Bei ${formatStunden(dauerMin)} ist eine Pause von mindestens ${stufe.minMinuten} Minuten erforderlich (Regel: ab ${stufe.abStunden} h).`
        );
        break;
      }
    }
  }

  // Mindestruhezeit zur Vorschicht
  if (regeln.minRuhezeitStunden && regeln.minRuhezeitStunden > 0) {
    const vortag = new Date(ctx.schicht.datum + 'T12:00:00');
    vortag.setDate(vortag.getDate() - 1);
    const vortagStr = vortag.toISOString().slice(0, 10);
    for (const e of ctx.andereEinteilungen) {
      if (e.datum !== vortagStr) continue;
      let ruhe = (minsAusZeit(ctx.schicht.von) + 1440) - minsAusZeit(e.bis);
      if (ruhe >= 1440) ruhe -= 1440;
      const ruheH = ruhe / 60;
      if (ruheH < regeln.minRuhezeitStunden) {
        sperren.push(
          `Nur ${formatStunden(ruhe)} Ruhezeit seit der Vorschicht (${e.von}-${e.bis}). Erforderlich: ${regeln.minRuhezeitStunden} h.`
        );
      }
    }
  }

  // Sonntagsarbeit
  if (regeln.sonntagErlaubt === false) {
    const dow = new Date(ctx.schicht.datum + 'T12:00:00').getDay();
    if (dow === 0) {
      sperren.push('Sonntagsarbeit ist laut Regelwerk nicht erlaubt.');
    }
  }

  // Wochenstunden
  if (regeln.maxWochenstunden && regeln.maxWochenstunden > 0) {
    const datum = new Date(ctx.schicht.datum + 'T12:00:00');
    const wochenstart = new Date(datum);
    wochenstart.setDate(datum.getDate() - ((datum.getDay() + 6) % 7));
    const wochenende = new Date(wochenstart);
    wochenende.setDate(wochenstart.getDate() + 6);
    const ws = wochenstart.toISOString().slice(0, 10);
    const we = wochenende.toISOString().slice(0, 10);
    const wochenSummeMin = ctx.andereEinteilungen
      .filter(e => e.datum >= ws && e.datum <= we)
      .reduce((s, e) => s + dauerInMinuten(e.von, e.bis), 0) + dauerMin;
    if (wochenSummeMin / 60 > regeln.maxWochenstunden) {
      sperren.push(
        `Wochenstunden ${formatStunden(wochenSummeMin)} ueberschreiten die Regel "Maximale Wochenstunden" (${regeln.maxWochenstunden} h).`
      );
    }
  }

  // Monatsstunden
  if (regeln.maxStundenProMonat && regeln.maxStundenProMonat > 0) {
    const monat = ctx.schicht.datum.substring(0, 7);
    const monatSumme = ctx.andereEinteilungen
      .filter(e => e.datum.startsWith(monat))
      .reduce((s, e) => s + dauerInMinuten(e.von, e.bis), 0) + dauerMin;
    if (monatSumme / 60 > regeln.maxStundenProMonat) {
      sperren.push(
        `Monatsstunden ${formatStunden(monatSumme)} ueberschreiten die Regel "Maximale Stunden pro Monat" (${regeln.maxStundenProMonat} h).`
      );
    } else if (monatSumme / 60 > regeln.maxStundenProMonat * 0.9) {
      hinweise.push(
        `Monatsstunden ${formatStunden(monatSumme)} naehern sich der Obergrenze (${regeln.maxStundenProMonat} h).`
      );
    }
  }

  return { ok: sperren.length === 0, hinweise, sperren };
}

/** Sinnvolle Default-Regeln, die ein Admin beim Setup uebernehmen kann. */
export const DEFAULT_REGELN: Regelwerk = {
  maxStundenProTag: 10,
  pauseSchwellen: [
    { abStunden: 6, minMinuten: 30 },
    { abStunden: 9, minMinuten: 45 },
  ],
  minRuhezeitStunden: 11,
  maxWochenstunden: 48,
  sonntagErlaubt: true,
};
