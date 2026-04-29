-- ==========================================================================
-- DienstLeitstelle SaaS — Datenbankschema
-- Mandantenfähig (Multi-Tenant) mit Row-Level-Security
-- ==========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==========================================================================
-- TENANTS — ein Eintrag pro Unternehmen / Kundenkonto
-- ==========================================================================
create table public.tenants (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  bundesland    text default 'BW',
  branche       text default 'standard',
  abo_status    text not null default 'trial' check (abo_status in ('trial','active','suspended','cancelled')),
  trial_bis     timestamptz default (now() + interval '14 days'),
  abo_bis       timestamptz,
  einstellungen jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ==========================================================================
-- PROFILES — verknüpft auth.users mit tenant + Rolle
-- ==========================================================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  tenant_id       uuid references public.tenants(id) on delete cascade,
  rolle           text not null check (rolle in ('admin','leitung','mitarbeiter')),
  vorname         text,
  nachname        text,
  email           text,
  telefon         text,
  mitarbeiter_id  uuid,            -- später per FK auf mitarbeiter.id, weil zirkulär
  aktiv           boolean not null default true,
  letzter_login   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_profiles_tenant on public.profiles(tenant_id);
create index idx_profiles_email  on public.profiles(email);

-- ==========================================================================
-- INVITATIONS — Admin lädt neue Nutzer ein
-- ==========================================================================
create table public.invitations (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  email       text not null,
  rolle       text not null check (rolle in ('admin','leitung','mitarbeiter')),
  vorname     text,
  nachname    text,
  token       text unique not null default encode(gen_random_bytes(24), 'hex'),
  invited_by  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_invitations_tenant on public.invitations(tenant_id);
create index idx_invitations_token  on public.invitations(token);

-- ==========================================================================
-- MITARBEITER — Personalstammdaten
-- ==========================================================================
create table public.mitarbeiter (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  vorname           text not null,
  nachname          text not null,
  email             text,
  telefon           text,
  position          text,
  vertrag           text not null default 'Vollzeit' check (vertrag in ('Vollzeit','Teilzeit','Minijob','Aushilfe')),
  qualifikation     text,
  gruppe            text not null default 'standard' check (gruppe in ('standard','betreuer','paedagoge','sicherheit','pflege','transport')),
  geburtstag        date,
  vertragsstunden   numeric(5,2),
  hauptberuf        text,
  arbeitgeber       text,
  user_id           uuid references public.profiles(id) on delete set null,
  aktiv             boolean not null default true,
  notiz             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_mitarbeiter_tenant on public.mitarbeiter(tenant_id);
create index idx_mitarbeiter_user   on public.mitarbeiter(user_id);

-- profiles → mitarbeiter FK jetzt setzbar
alter table public.profiles
  add constraint profiles_mitarbeiter_fk
  foreign key (mitarbeiter_id) references public.mitarbeiter(id) on delete set null;

-- ==========================================================================
-- OBJEKTE — Einsatzorte
-- ==========================================================================
create table public.objekte (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  name          text not null,
  adresse       text,
  von_default   time,
  bis_default   time,
  branche       text not null default 'standard' check (branche in ('standard','sicherheit','gesundheit','transport','gastro')),
  farbe_idx     int not null default 0,
  aktiv         boolean not null default true,
  notiz         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_objekte_tenant on public.objekte(tenant_id);

-- ==========================================================================
-- EINTEILUNGEN — Schichten
-- ==========================================================================
create table public.einteilungen (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  objekt_id       uuid not null references public.objekte(id) on delete cascade,
  mitarbeiter_id  uuid not null references public.mitarbeiter(id) on delete cascade,
  datum           date not null,
  von             time not null,
  bis             time not null,
  pause_min       int default 0,
  notiz           text,
  bestaetigt_at   timestamptz,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_einteilungen_tenant_datum on public.einteilungen(tenant_id, datum);
create index idx_einteilungen_mitarbeiter  on public.einteilungen(mitarbeiter_id, datum);
create index idx_einteilungen_objekt       on public.einteilungen(objekt_id, datum);

-- ==========================================================================
-- URLAUBE / ABWESENHEIT
-- ==========================================================================
create table public.urlaube (
  id               uuid primary key default uuid_generate_v4(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  mitarbeiter_id   uuid not null references public.mitarbeiter(id) on delete cascade,
  typ              text not null default 'urlaub' check (typ in ('urlaub','krank','fza','sonderurlaub','unbezahlt','eltern','fortbildung','sonstiges')),
  von              date not null,
  bis              date not null,
  tage             numeric(4,1) not null,
  status           text not null default 'offen' check (status in ('offen','genehmigt','abgelehnt','zurueckgezogen')),
  notiz            text,
  beantragt_von    uuid references public.profiles(id) on delete set null,
  bearbeitet_von   uuid references public.profiles(id) on delete set null,
  bearbeitet_at    timestamptz,
  created_at       timestamptz not null default now()
);
create index idx_urlaube_tenant   on public.urlaube(tenant_id);
create index idx_urlaube_ma       on public.urlaube(mitarbeiter_id);
create index idx_urlaube_zeitraum on public.urlaube(von, bis);

-- ==========================================================================
-- ZEITERFASSUNG
-- ==========================================================================
create table public.zeiten (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  mitarbeiter_id  uuid not null references public.mitarbeiter(id) on delete cascade,
  objekt_id       uuid references public.objekte(id) on delete set null,
  datum           date not null,
  von             time not null,
  bis             time not null,
  pause_min       int default 0,
  notiz           text,
  created_at      timestamptz not null default now()
);
create index idx_zeiten_tenant on public.zeiten(tenant_id, datum);
create index idx_zeiten_ma     on public.zeiten(mitarbeiter_id, datum);

-- ==========================================================================
-- VERFÜGBARKEIT — Mitarbeiter trägt ein, wann er kann/nicht kann
-- ==========================================================================
create table public.verfuegbarkeit (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  mitarbeiter_id  uuid not null references public.mitarbeiter(id) on delete cascade,
  datum           date not null,
  status          text not null check (status in ('verfuegbar','nicht_verfuegbar','wunsch_frei','wunsch_dienst')),
  von             time,
  bis             time,
  notiz           text,
  created_at      timestamptz not null default now()
);
create index idx_verf_tenant on public.verfuegbarkeit(tenant_id);
create index idx_verf_ma_dat on public.verfuegbarkeit(mitarbeiter_id, datum);

-- ==========================================================================
-- SCHICHTTAUSCH
-- ==========================================================================
create table public.schichttausch (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  einteilung_id   uuid not null references public.einteilungen(id) on delete cascade,
  von_mitarbeiter uuid not null references public.mitarbeiter(id) on delete cascade,
  zu_mitarbeiter  uuid references public.mitarbeiter(id) on delete set null,
  status          text not null default 'angefragt' check (status in ('angefragt','akzeptiert','genehmigt','abgelehnt','zurueckgezogen')),
  grund           text,
  created_at      timestamptz not null default now(),
  bearbeitet_at   timestamptz
);
create index idx_tausch_tenant on public.schichttausch(tenant_id);

-- ==========================================================================
-- BERICHTE / ÜBERGABEN
-- ==========================================================================
create table public.berichte (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  objekt_id       uuid not null references public.objekte(id) on delete cascade,
  mitarbeiter_id  uuid references public.mitarbeiter(id) on delete set null,
  typ             text not null default 'uebergabe' check (typ in ('uebergabe','vorkommnis','wartung','bewohner','sonstiges')),
  titel           text not null,
  inhalt          text not null,
  dringlichkeit   text default 'mittel' check (dringlichkeit in ('niedrig','mittel','hoch','kritisch')),
  status          text default 'offen' check (status in ('offen','in_bearbeitung','erledigt')),
  ki_zusammenfassung text,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null
);
create index idx_berichte_tenant on public.berichte(tenant_id);
create index idx_berichte_objekt on public.berichte(objekt_id, created_at desc);

create table public.bericht_lesebestaetigungen (
  id          uuid primary key default uuid_generate_v4(),
  bericht_id  uuid not null references public.berichte(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  gelesen_at  timestamptz not null default now(),
  unique (bericht_id, user_id)
);

-- ==========================================================================
-- BEWOHNER / KLIENTEN (objektspezifisch)
-- ==========================================================================
create table public.bewohner (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  objekt_id   uuid not null references public.objekte(id) on delete cascade,
  vorname     text not null,
  nachname    text not null,
  geburtstag  date,
  zimmer      text,
  notiz       text,
  aktiv       boolean not null default true,
  created_at  timestamptz not null default now()
);
create index idx_bewohner_tenant on public.bewohner(tenant_id);
create index idx_bewohner_objekt on public.bewohner(objekt_id);

-- ==========================================================================
-- ANWEISUNGEN (objektspezifisch)
-- ==========================================================================
create table public.anweisungen (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  objekt_id   uuid not null references public.objekte(id) on delete cascade,
  titel       text not null,
  inhalt      text not null,
  prioritaet  text default 'normal' check (prioritaet in ('normal','wichtig','kritisch')),
  aktiv       boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null
);
create index idx_anweisungen_tenant on public.anweisungen(tenant_id);
create index idx_anweisungen_objekt on public.anweisungen(objekt_id);

-- ==========================================================================
-- TERMINE (objektspezifisch)
-- ==========================================================================
create table public.termine (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  objekt_id   uuid not null references public.objekte(id) on delete cascade,
  titel       text not null,
  beschreibung text,
  dat         date not null,
  uhrzeit     time,
  erledigt    boolean not null default false,
  erledigt_at timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_termine_tenant on public.termine(tenant_id);
create index idx_termine_objekt on public.termine(objekt_id, dat);

-- ==========================================================================
-- SCHWARZES BRETT
-- ==========================================================================
create table public.pinnwand (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  titel         text not null,
  inhalt        text not null,
  kategorie     text default 'allgemein',
  angeheftet    boolean not null default false,
  ablauf        date,
  created_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id) on delete set null
);
create index idx_pinnwand_tenant on public.pinnwand(tenant_id, created_at desc);

create table public.pinnwand_lesebestaetigungen (
  id          uuid primary key default uuid_generate_v4(),
  pinnwand_id uuid not null references public.pinnwand(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  gelesen_at  timestamptz not null default now(),
  unique (pinnwand_id, user_id)
);

-- ==========================================================================
-- SCHICHTVORLAGEN
-- ==========================================================================
create table public.schichtvorlagen (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text not null,
  objekt_id   uuid references public.objekte(id) on delete cascade,
  von         time not null,
  bis         time not null,
  pause_min   int default 0,
  notiz       text,
  created_at  timestamptz not null default now()
);
create index idx_vorlagen_tenant on public.schichtvorlagen(tenant_id);

-- ==========================================================================
-- AUDIT LOG -- wer hat was wann gemacht (Nachweis + DSGVO)
-- ==========================================================================
create table public.audit_log (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  aktion      text not null,
  entitaet    text,
  entitaet_id uuid,
  details     jsonb,
  ip_address  inet,
  created_at  timestamptz not null default now()
);
create index idx_audit_tenant on public.audit_log(tenant_id, created_at desc);

-- ==========================================================================
-- TRIGGER: updated_at automatisch setzen
-- ==========================================================================
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger t_tenants_updated      before update on public.tenants      for each row execute function public.touch_updated_at();
create trigger t_profiles_updated     before update on public.profiles     for each row execute function public.touch_updated_at();
create trigger t_mitarbeiter_updated  before update on public.mitarbeiter  for each row execute function public.touch_updated_at();
create trigger t_objekte_updated      before update on public.objekte      for each row execute function public.touch_updated_at();
create trigger t_einteilungen_updated before update on public.einteilungen for each row execute function public.touch_updated_at();
