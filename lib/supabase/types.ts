// Vereinfachte Typen für unser Schema. Für vollständige Typen später `supabase gen types` verwenden.
export type Rolle = 'admin' | 'leitung' | 'mitarbeiter';
export type Vertrag = 'Vollzeit' | 'Teilzeit' | 'Minijob' | 'Aushilfe';
export type Gruppe = 'standard' | 'betreuer' | 'paedagoge' | 'sicherheit' | 'pflege' | 'transport';
export type Branche = 'standard' | 'sicherheit' | 'gesundheit' | 'transport' | 'gastro';
export type UrlaubsTyp =
  | 'urlaub'
  | 'krank'
  | 'fza'
  | 'sonderurlaub'
  | 'unbezahlt'
  | 'eltern'
  | 'fortbildung'
  | 'sonstiges';

export interface Tenant {
  id: string;
  name: string;
  bundesland: string;
  branche: string;
  abo_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  trial_bis: string | null;
}

export interface Profile {
  id: string;
  tenant_id: string | null;
  rolle: Rolle;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
  mitarbeiter_id: string | null;
  aktiv: boolean;
}

export interface Mitarbeiter {
  id: string;
  tenant_id: string;
  vorname: string;
  nachname: string;
  email: string | null;
  telefon: string | null;
  position: string | null;
  vertrag: Vertrag;
  qualifikation: string | null;
  gruppe: Gruppe;
  geburtstag: string | null;
  vertragsstunden: number | null;
  user_id: string | null;
  aktiv: boolean;
}

export interface Objekt {
  id: string;
  tenant_id: string;
  name: string;
  adresse: string | null;
  von_default: string | null;
  bis_default: string | null;
  branche: Branche;
  farbe_idx: number;
  aktiv: boolean;
}

export interface Einteilung {
  id: string;
  tenant_id: string;
  objekt_id: string;
  mitarbeiter_id: string;
  datum: string;
  von: string;
  bis: string;
  pause_min: number | null;
  notiz: string | null;
  bestaetigt_at: string | null;
}

export interface Urlaub {
  id: string;
  tenant_id: string;
  mitarbeiter_id: string;
  typ: UrlaubsTyp;
  von: string;
  bis: string;
  tage: number;
  status: 'offen' | 'genehmigt' | 'abgelehnt' | 'zurueckgezogen';
  notiz: string | null;
}

export interface Database {
  public: {
    Tables: {
      tenants: { Row: Tenant; Insert: Partial<Tenant>; Update: Partial<Tenant> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      mitarbeiter: { Row: Mitarbeiter; Insert: Partial<Mitarbeiter>; Update: Partial<Mitarbeiter> };
      objekte: { Row: Objekt; Insert: Partial<Objekt>; Update: Partial<Objekt> };
      einteilungen: { Row: Einteilung; Insert: Partial<Einteilung>; Update: Partial<Einteilung> };
      urlaube: { Row: Urlaub; Insert: Partial<Urlaub>; Update: Partial<Urlaub> };
    };
    Functions: {
      create_tenant_for_user: {
        Args: { p_firma: string; p_bundesland?: string; p_branche?: string };
        Returns: string;
      };
    };
  };
}
