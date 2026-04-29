-- ==========================================================================
-- Phase 1 — Datenmodell-Erweiterung
-- Berufsgruppen mit Regelwerk, Vorgesetzter, Vertretung, Berichts-Vorlagen
-- (Form-Builder), Aufgaben, Stornierungsanfragen, Berechtigungsnachweise,
-- Eskalationsketten.
-- ==========================================================================

-- ==== BERUFSGRUPPEN mit konfigurierbarem Regelwerk =======================
create table public.berufsgruppen (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  name          text not null,
  beschreibung  text,
  regelwerk     jsonb not null default '{}'::jsonb,  -- siehe lib/regeln.ts
  aktiv         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, name)
);
create index idx_berufsgruppen_tenant on public.berufsgruppen(tenant_id);
alter table public.berufsgruppen enable row level security;
create policy bg_select_tenant on public.berufsgruppen
  for select using (tenant_id = public.current_tenant_id());
create policy bg_modify_admin_leitung on public.berufsgruppen
  for all using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung())
  with check (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());

-- ==== MITARBEITER erweitern =============================================
alter table public.mitarbeiter add column if not exists berufsgruppe_id uuid references public.berufsgruppen(id) on delete set null;
alter table public.mitarbeiter add column if not exists vorgesetzter_id uuid references public.mitarbeiter(id) on delete set null;
alter table public.mitarbeiter add column if not exists eintrittsdatum date;
alter table public.mitarbeiter add column if not exists austrittsdatum date;
alter table public.mitarbeiter add column if not exists jahresurlaub_tage numeric(4,1);
alter table public.mitarbeiter add column if not exists urlaubstage_genommen numeric(4,1) default 0;
alter table public.mitarbeiter add column if not exists lohn_pro_stunde numeric(8,2);
alter table public.mitarbeiter add column if not exists foto_url text;
alter table public.mitarbeiter add column if not exists notfallkontakt jsonb;

create index if not exists idx_mitarbeiter_vorgesetzter on public.mitarbeiter(vorgesetzter_id);
create index if not exists idx_mitarbeiter_berufsgruppe on public.mitarbeiter(berufsgruppe_id);

-- ==== BERECHTIGUNGSNACHWEISE ============================================
-- Z.B. erweitertes Fuehrungszeugnis, Sachkundepruefung, Erste-Hilfe-Schein
create table public.berechtigungsnachweise (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  mitarbeiter_id  uuid not null references public.mitarbeiter(id) on delete cascade,
  art             text not null,
  ausgestellt_am  date,
  gueltig_bis     date,
  ausgestellt_von text,
  notiz           text,
  datei_url       text,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null
);
create index idx_nachweise_tenant on public.berechtigungsnachweise(tenant_id);
create index idx_nachweise_ma on public.berechtigungsnachweise(mitarbeiter_id);
create index idx_nachweise_ablauf on public.berechtigungsnachweise(gueltig_bis) where gueltig_bis is not null;
alter table public.berechtigungsnachweise enable row level security;
create policy nw_select_tenant on public.berechtigungsnachweise
  for select using (tenant_id = public.current_tenant_id());
create policy nw_modify_admin_leitung on public.berechtigungsnachweise
  for all using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung())
  with check (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());

-- ==== VERTRETUNG ========================================================
-- Leitung A definiert: Vertretung B von ... bis ... -- waehrend dem Zeitraum
-- bekommt B die Inboxen / Genehmigungsrechte von A.
create table public.vertretungen (
  id               uuid primary key default uuid_generate_v4(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  vertretene_id    uuid not null references public.profiles(id) on delete cascade,
  vertreter_id     uuid not null references public.profiles(id) on delete cascade,
  von              date not null,
  bis              date not null,
  notiz            text,
  created_at       timestamptz not null default now(),
  check (vertretene_id <> vertreter_id),
  check (bis >= von)
);
create index idx_vertretungen_tenant on public.vertretungen(tenant_id);
create index idx_vertretungen_vertreter on public.vertretungen(vertreter_id, von, bis);
alter table public.vertretungen enable row level security;
create policy vt_select_tenant on public.vertretungen
  for select using (tenant_id = public.current_tenant_id());
create policy vt_modify_self_or_admin on public.vertretungen
  for all using (tenant_id = public.current_tenant_id() and (vertretene_id = auth.uid() or public.is_admin()))
  with check (tenant_id = public.current_tenant_id() and (vertretene_id = auth.uid() or public.is_admin()));

create or replace function public.aktive_vertretungen_fuer(p_user uuid)
returns setof uuid language sql stable security definer set search_path = public, auth as $$
  select vertretene_id from public.vertretungen
  where vertreter_id = p_user
    and von <= current_date and bis >= current_date
$$;

-- ==== BERICHTS-VORLAGEN (Form-Builder) ==================================
create table public.berichts_vorlagen (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  name            text not null,
  beschreibung    text,
  zweck           text default 'sonstiges' check (zweck in ('uebergabe','vorfall','wartung','rundgang','medikamente','postenbuch','auftraggeber','sonstiges')),
  felder          jsonb not null default '[]'::jsonb,  -- Felddefinitionen
  ausfuelldauer   text default 'beliebig' check (ausfuelldauer in ('beliebig','schichtbeginn','schichtende','bei_bedarf')),
  rolle_pflicht   text default 'mitarbeiter' check (rolle_pflicht in ('mitarbeiter','leitung','admin','alle')),
  aktiv           boolean not null default true,
  icon            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_bv_tenant on public.berichts_vorlagen(tenant_id);
alter table public.berichts_vorlagen enable row level security;
create policy bv_select_tenant on public.berichts_vorlagen
  for select using (tenant_id = public.current_tenant_id());
create policy bv_modify_admin on public.berichts_vorlagen
  for all using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

-- BERICHTS-EINTRAEGE: ausgefuellte Instanzen
create table public.berichts_eintraege (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  vorlage_id      uuid not null references public.berichts_vorlagen(id) on delete restrict,
  objekt_id       uuid references public.objekte(id) on delete set null,
  einteilung_id   uuid references public.einteilungen(id) on delete set null,
  mitarbeiter_id  uuid references public.mitarbeiter(id) on delete set null,
  werte           jsonb not null default '{}'::jsonb,
  schweregrad     int check (schweregrad between 1 and 5),
  status          text default 'offen' check (status in ('offen','in_bearbeitung','erledigt','archiviert')),
  signatur_url    text,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null,
  bearbeitet_von  uuid references public.profiles(id) on delete set null,
  bearbeitet_at   timestamptz
);
create index idx_be_tenant on public.berichts_eintraege(tenant_id, created_at desc);
create index idx_be_vorlage on public.berichts_eintraege(vorlage_id);
create index idx_be_objekt on public.berichts_eintraege(objekt_id);
alter table public.berichts_eintraege enable row level security;
create policy be_select_tenant on public.berichts_eintraege
  for select using (tenant_id = public.current_tenant_id());
create policy be_insert_tenant on public.berichts_eintraege
  for insert with check (tenant_id = public.current_tenant_id());
create policy be_update_tenant on public.berichts_eintraege
  for update using (tenant_id = public.current_tenant_id());

-- Lesebestaetigungen fuer Berichte (Uebergabe muss vom Folge-MA gelesen werden)
create table public.berichts_lesebestaetigungen (
  id          uuid primary key default uuid_generate_v4(),
  eintrag_id  uuid not null references public.berichts_eintraege(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  gelesen_at  timestamptz not null default now(),
  signatur_url text,
  unique (eintrag_id, user_id)
);
alter table public.berichts_lesebestaetigungen enable row level security;
create policy bel_select_tenant on public.berichts_lesebestaetigungen
  for select using (
    exists (select 1 from public.berichts_eintraege e where e.id = eintrag_id and e.tenant_id = public.current_tenant_id())
  );
create policy bel_insert_self on public.berichts_lesebestaetigungen
  for insert with check (user_id = auth.uid());

-- ==== AUFGABEN-VORLAGEN + AUFGABEN ======================================
create table public.aufgaben_vorlagen (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  objekt_id     uuid references public.objekte(id) on delete cascade,  -- null = global
  titel         text not null,
  beschreibung  text,
  zyklus        text default 'pro_schicht' check (zyklus in ('pro_schicht','taeglich','wochenstart','monatlich')),
  pflicht       boolean not null default false,
  reihenfolge   int default 0,
  aktiv         boolean not null default true,
  created_at    timestamptz not null default now()
);
create index idx_av_tenant on public.aufgaben_vorlagen(tenant_id);
create index idx_av_objekt on public.aufgaben_vorlagen(objekt_id);
alter table public.aufgaben_vorlagen enable row level security;
create policy av_select_tenant on public.aufgaben_vorlagen
  for select using (tenant_id = public.current_tenant_id());
create policy av_modify_admin_leitung on public.aufgaben_vorlagen
  for all using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung())
  with check (tenant_id = public.current_tenant_id());

create table public.aufgaben (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  vorlage_id      uuid references public.aufgaben_vorlagen(id) on delete set null,
  einteilung_id   uuid references public.einteilungen(id) on delete cascade,
  objekt_id       uuid references public.objekte(id) on delete cascade,
  mitarbeiter_id  uuid references public.mitarbeiter(id) on delete set null,
  titel           text not null,
  beschreibung    text,
  faellig_am      date,
  erledigt        boolean not null default false,
  erledigt_at     timestamptz,
  erledigt_von    uuid references public.profiles(id) on delete set null,
  notiz           text,
  created_at      timestamptz not null default now()
);
create index idx_aufg_tenant on public.aufgaben(tenant_id);
create index idx_aufg_einteilung on public.aufgaben(einteilung_id);
create index idx_aufg_ma_offen on public.aufgaben(mitarbeiter_id, erledigt) where not erledigt;
alter table public.aufgaben enable row level security;
create policy auf_select_tenant on public.aufgaben
  for select using (tenant_id = public.current_tenant_id());
create policy auf_modify_self_or_admin on public.aufgaben
  for all using (
    tenant_id = public.current_tenant_id()
    and (mitarbeiter_id = public.current_mitarbeiter_id() or public.is_admin_or_leitung())
  )
  with check (tenant_id = public.current_tenant_id());

-- ==== STORNIERUNGS-ANFRAGEN ============================================
create table public.stornierungs_anfragen (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  einteilung_id   uuid references public.einteilungen(id) on delete cascade,
  aufgabe_id      uuid references public.aufgaben(id) on delete cascade,
  beantragt_von   uuid not null references public.profiles(id) on delete cascade,
  grund           text not null,
  status          text default 'offen' check (status in ('offen','genehmigt','abgelehnt','zurueckgezogen')),
  bearbeitet_von  uuid references public.profiles(id) on delete set null,
  bearbeitet_at   timestamptz,
  bearbeitet_notiz text,
  created_at      timestamptz not null default now(),
  check ((einteilung_id is not null) or (aufgabe_id is not null))
);
create index idx_storn_tenant on public.stornierungs_anfragen(tenant_id, status);
alter table public.stornierungs_anfragen enable row level security;
create policy stn_select_tenant on public.stornierungs_anfragen
  for select using (tenant_id = public.current_tenant_id());
create policy stn_insert_self on public.stornierungs_anfragen
  for insert with check (tenant_id = public.current_tenant_id() and beantragt_von = auth.uid());
create policy stn_update_admin_leitung on public.stornierungs_anfragen
  for update using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());

-- ==== ESKALATIONSKETTE pro OBJEKT ======================================
create table public.eskalationsketten (
  id               uuid primary key default uuid_generate_v4(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  objekt_id        uuid not null references public.objekte(id) on delete cascade,
  ab_schweregrad   int not null check (ab_schweregrad between 1 and 5),
  reihenfolge      int not null,
  empfaenger_id    uuid references public.profiles(id) on delete set null,
  empfaenger_typ   text default 'profil' check (empfaenger_typ in ('profil','rolle','externer_kontakt')),
  externer_kontakt jsonb,                                  -- {name, telefon, email}
  created_at       timestamptz not null default now()
);
create index idx_esk_tenant on public.eskalationsketten(tenant_id);
create index idx_esk_objekt on public.eskalationsketten(objekt_id);
alter table public.eskalationsketten enable row level security;
create policy esk_select_tenant on public.eskalationsketten
  for select using (tenant_id = public.current_tenant_id());
create policy esk_modify_admin on public.eskalationsketten
  for all using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

-- ==== TRIGGERS for updated_at ===========================================
create trigger t_berufsgruppen_updated      before update on public.berufsgruppen      for each row execute function public.touch_updated_at();
create trigger t_berichts_vorlagen_updated  before update on public.berichts_vorlagen  for each row execute function public.touch_updated_at();
