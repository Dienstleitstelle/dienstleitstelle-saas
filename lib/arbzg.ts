/**
 * ArbZG-Compliance-Engine
 * Portiert aus dem Original-HTML-Tool, jetzt als saubere TypeScript-Modul mit Tests-tauglichkeit.
 *
 * Prüft eine geplante Schicht gegen:
 *   §3 ArbZG  – maximale Schichtdauer (10h Standard, 12h für Sicherheit/Pflege per Tarifvertrag)
 *   §4 ArbZG  – Pausenpflicht (30min ab 6h, 45min ab 9h)
 *   §5 ArbZG  – 11h Mindestruhezeit zwischen zwei Schichten
 *   §9 ArbZG  – Sonn-/Feiertagsarbeit
 *   Minijob   – 538€-Grenze ≈ 38,7h/Monat (Stand 2026: 603€ ≈ 43,4h bei 13,90€)
 */

import type { Gruppe, Branche, Vertrag } from '@/lib/supabase/types';

export interface ArbZGContext {
  von: string;          // "07:00"
  bis: string;          // "15:00"
  datum: string;        // "2026-04-29"
  ma: {
    gruppe: Gruppe;
    vertrag: Vertrag;
  };
  obj: {
    branche: Branche;
  };
  /** Andere Einteilungen desselben Mitarbeiters (für Ruhezeit + Minijob-Stunden) */
  andereEinteilungen: { datum: string; von: string; bis: string }[];
}

export interface ArbZGResult {
  ok: boolean;
  blocks: string[];
  warns: string[];
}

export const minsFromTime = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const schichtDauerMin = (von: string, bis: string): number => {
  let d = minsFromTime(bis) - minsFromTime(von);
  if (d < 0) d += 1440;
  return d;
};

export function pruefeArbZG(ctx: ArbZGContext): ArbZGResult {
  const blocks: string[] = [];
  const warns: string[] = [];

  const dauer = schichtDauerMin(ctx.von, ctx.bis);
  const is12h =
    ctx.ma.gruppe === 'sicherheit' ||
    ctx.ma.gruppe === 'pflege' ||
    (ctx.ma.gruppe === 'standard' &&
      (ctx.obj.branche === 'sicherheit' || ctx.obj.branche === 'gesundheit'));
  const maxMin = is12h ? 720 : 600;
  const maxH = maxMin / 60;

  // §3 ArbZG — Schichtdauer
  if (dauer > maxMin) {
    blocks.push(
      `${Math.floor(dauer / 60)}h ${dauer % 60}min überschreitet das Maximum von ${maxH}h${
        is12h ? ' (Sonderregelung per Tarifvertrag)' : ''
      } (§ 3 ArbZG).`
    );
  } else if (dauer > 480) {
    warns.push(
      `${Math.floor(dauer / 60)}h ${dauer % 60}min überschreitet 8h — Ausgleich innerhalb von 6 Monaten nötig (§ 3 ArbZG).`
    );
  }
  if (is12h && dauer > 600 && dauer <= 720) {
    warns.push(`12h-Schicht: nur per Tarifvertrag zulässig — Dokumentationspflicht beachten.`);
  }

  // §4 ArbZG — Pause
  if (dauer > 540) warns.push('Mehr als 9h: mind. 45 Min. Pause erforderlich (§ 4 ArbZG).');
  else if (dauer > 360) warns.push('Mehr als 6h: mind. 30 Min. Pause erforderlich (§ 4 ArbZG).');

  // §5 ArbZG — 11h Ruhezeit
  const prevDate = new Date(ctx.datum + 'T12:00:00');
  prevDate.setDate(prevDate.getDate() - 1);
  const prevStr = prevDate.toISOString().slice(0, 10);
  for (const ein of ctx.andereEinteilungen) {
    if (ein.datum !== prevStr) continue;
    let ruhe = (minsFromTime(ctx.von) + 1440) - minsFromTime(ein.bis);
    if (ruhe >= 1440) ruhe -= 1440;
    if (ruhe < 660) {
      blocks.push(
        `Nur ${Math.floor(ruhe / 60)}h ${ruhe % 60}min Ruhezeit seit Vortag (${ein.von}–${ein.bis}). Mindestens 11h erforderlich (§ 5 ArbZG).`
      );
    }
  }

  // §9 ArbZG — Sonn-/Feiertagsarbeit
  const dow = new Date(ctx.datum + 'T12:00:00').getDay();
  if (dow === 0)
    warns.push('Sonntagsarbeit — nur in Ausnahmefällen erlaubt; Ersatzruhetag innerhalb von 2 Wochen (§ 9 ArbZG).');

  // Minijob-Wächter (Stand 2026: 603€-Grenze, ~43,4h bei 13,90€)
  if (ctx.ma.vertrag === 'Minijob') {
    const monat = ctx.datum.substring(0, 7);
    const monatH =
      ctx.andereEinteilungen
        .filter((e) => e.datum.startsWith(monat))
        .reduce((s, e) => s + schichtDauerMin(e.von, e.bis) / 60, 0) +
      dauer / 60;
    if (monatH > 43.4) {
      blocks.push(
        `Minijob: ${monatH.toFixed(1)}h diesen Monat — überschreitet ~43,4h (603€-Grenze bei 13,90€). Sozialversicherungspflicht droht.`
      );
    } else if (monatH > 38) {
      warns.push(
        `Minijob: ${monatH.toFixed(1)}h diesen Monat — nähert sich der 603€-Grenze. Bitte prüfen.`
      );
    }
  }

  return { ok: blocks.length === 0, blocks, warns };
}
