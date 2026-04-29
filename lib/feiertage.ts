/** Feiertagsberechnung für deutsche Bundesländer (portiert aus Original) */

const BUNDESLAENDER = [
  'BW','BY','BE','BB','HB','HH','HE','MV','NI','NW','RP','SL','SN','ST','SH','TH',
] as const;
export type Bundesland = (typeof BUNDESLAENDER)[number];

function easterSunday(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function add(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

export interface Feiertag {
  datum: string;     // YYYY-MM-DD
  name: string;
  bundeslaender?: Bundesland[]; // wenn fehlt: bundesweit
}

export function getFeiertage(year: number): Feiertag[] {
  const ostern = easterSunday(year);
  const f: Feiertag[] = [
    { datum: `${year}-01-01`, name: 'Neujahr' },
    { datum: `${year}-01-06`, name: 'Heilige Drei Könige', bundeslaender: ['BW', 'BY', 'ST'] },
    { datum: fmt(add(ostern, -2)), name: 'Karfreitag' },
    { datum: fmt(add(ostern, 1)), name: 'Ostermontag' },
    { datum: `${year}-05-01`, name: 'Tag der Arbeit' },
    { datum: fmt(add(ostern, 39)), name: 'Christi Himmelfahrt' },
    { datum: fmt(add(ostern, 50)), name: 'Pfingstmontag' },
    { datum: fmt(add(ostern, 60)), name: 'Fronleichnam', bundeslaender: ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'] },
    { datum: `${year}-08-15`, name: 'Mariä Himmelfahrt', bundeslaender: ['BY', 'SL'] },
    { datum: `${year}-10-03`, name: 'Tag der Deutschen Einheit' },
    { datum: `${year}-10-31`, name: 'Reformationstag', bundeslaender: ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'] },
    { datum: `${year}-11-01`, name: 'Allerheiligen', bundeslaender: ['BW', 'BY', 'NW', 'RP', 'SL'] },
    { datum: `${year}-12-25`, name: '1. Weihnachtstag' },
    { datum: `${year}-12-26`, name: '2. Weihnachtstag' },
  ];
  return f;
}

export function istFeiertag(datum: string, bundesland: Bundesland): Feiertag | undefined {
  const year = parseInt(datum.slice(0, 4), 10);
  return getFeiertage(year).find(
    (f) => f.datum === datum && (!f.bundeslaender || f.bundeslaender.includes(bundesland))
  );
}
