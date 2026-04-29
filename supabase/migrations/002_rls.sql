-- ==========================================================================
-- Row-Level-Security: Mandantentrennung
-- Jeder eingeloggte User sieht ausschließlich Daten seines Tenants
-- ==========================================================================

-- ==== HELFER-FUNKTIONEN =====================================================

-- Liefert die tenant_id des aktuell eingeloggten Users
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

-- Liefert die Rolle des aktuell eingeloggten Users
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select rolle from public.profiles where id = auth.uid()
$$;

-- Liefert die mitarbeiter_id des aktuell eingeloggten Users (falls verknüpft)
create or replace function public.current_mitarbeiter_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select mitarbeiter_id from public.profiles where id = auth.uid()
$$;

-- Bequemer Check: Admin oder Leitung
create or replace function public.is_admin_or_leitung()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce((select rolle in ('admin','leitung') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce((select rolle = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- ==== RLS AKTIVIEREN ========================================================

alter table public.tenants                       enable row level security;
alter table public.profiles                      enable row level security;
alter table public.invitations                   enable row level security;
alter table public.mitarbeiter                   enable row level security;
alter table public.objekte                       enable row level security;
alter table public.einteilungen                  enable row level security;
alter table public.urlaube                       enable row level security;
alter table public.zeiten                        enable row level security;
alter table public.verfuegbarkeit                enable row level security;
alter table public.schichttausch                 enable row level security;
alter table public.berichte                      enable row level security;
alter table public.bericht_lesebestaetigungen    enable row level security;
alter table public.bewohner                      enable row level security;
alter table public.anweisungen                   enable row level security;
alter table public.termine                       enable row level security;
alter table public.pinnwand                      enable row level security;
alter table public.pinnwand_lesebestaetigungen   enable row level security;
alter table public.schichtvorlagen               enable row level security;
alter table public.audit_log                     enable row level security;

-- ==== TENANTS ===============================================================
create policy tenants_select on public.tenants
  for select using (id = public.current_tenant_id());
create policy tenants_update_admin on public.tenants
  for update using (id = public.current_tenant_id() and public.is_admin());
-- INSERT erfolgt nur via Service-Role (Server-Aktion bei Signup)

-- ==== PROFILES ==============================================================
create policy profiles_select_self_or_tenant on public.profiles
  for select using (
    id = auth.uid() or tenant_id = public.current_tenant_id()
  );
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid());
create policy profiles_update_admin on public.profiles
  for update using (tenant_id = public.current_tenant_id() and public.is_admin());

-- ==== INVITATIONS ===========================================================
create policy invitations_select_admin on public.invitations
  for select using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());
create policy invitations_insert_admin on public.invitations
  for insert with check (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());
create policy invitations_delete_admin on public.invitations
  for delete using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());

-- ==== MITARBEITER ===========================================================
create policy ma_select_tenant on public.mitarbeiter
  for select using (tenant_id = public.current_tenant_id());
create policy ma_modify_admin_leitung on public.mitarbeiter
  for all using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung())
  with check (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());

-- ==== OBJEKTE ===============================================================
create policy obj_select_tenant on public.objekte
  for select using (tenant_id = public.current_tenant_id());
create policy obj_modify_admin_leitung on public.objekte
  for all using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung())
  with check (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());

-- ==== EINTEILUNGEN ==========================================================
create policy ein_select_tenant on public.einteilungen
  for select using (tenant_id = public.current_tenant_id());
create policy ein_modify_admin_leitung on public.einteilungen
  for insert with check (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());
create policy ein_update_admin_leitung on public.einteilungen
  for update using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());
create policy ein_delete_admin_leitung on public.einteilungen
  for delete using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());
-- Mitarbeiter darf eigene Schicht "bestätigen" (UPDATE auf bestaetigt_at) — TODO als zusätzliche Policy

-- ==== URLAUBE ===============================================================
create policy url_select_tenant on public.urlaube
  for select using (tenant_id = public.current_tenant_id());
create policy url_insert_self_or_admin on public.urlaube
  for insert with check (
    tenant_id = public.current_tenant_id()
    and (public.is_admin_or_leitung() or mitarbeiter_id = public.current_mitarbeiter_id())
  );
create policy url_update_admin_leitung on public.urlaube
  for update using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());
create policy url_delete_self_or_admin on public.urlaube
  for delete using (
    tenant_id = public.current_tenant_id()
    and (public.is_admin_or_leitung() or mitarbeiter_id = public.current_mitarbeiter_id())
  );

-- ==== ZEITEN ================================================================
create policy zeit_select_tenant on public.zeiten
  for select using (tenant_id = public.current_tenant_id());
create policy zeit_insert_self_or_admin on public.zeiten
  for insert with check (
    tenant_id = public.current_tenant_id()
    and (public.is_admin_or_leitung() or mitarbeiter_id = public.current_mitarbeiter_id())
  );
create policy zeit_update_admin_leitung on public.zeiten
  for update using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());
create policy zeit_delete_admin_leitung on public.zeiten
  for delete using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());

-- ==== VERFÜGBARKEIT =========================================================
create policy verf_select_tenant on public.verfuegbarkeit
  for select using (tenant_id = public.current_tenant_id());
create policy verf_modify_self_or_admin on public.verfuegbarkeit
  for all using (
    tenant_id = public.current_tenant_id()
    and (public.is_admin_or_leitung() or mitarbeiter_id = public.current_mitarbeiter_id())
  );

-- ==== SCHICHTTAUSCH =========================================================
create policy tausch_select_tenant on public.schichttausch
  for select using (tenant_id = public.current_tenant_id());
create policy tausch_insert_self on public.schichttausch
  for insert with check (
    tenant_id = public.current_tenant_id()
    and (public.is_admin_or_leitung() or von_mitarbeiter = public.current_mitarbeiter_id())
  );
create policy tausch_update_admin_leitung on public.schichttausch
  for update using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung());

-- ==== BERICHTE ==============================================================
create policy ber_select_tenant on public.berichte
  for select using (tenant_id = public.current_tenant_id());
create policy ber_modify_tenant on public.berichte
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy lesb_select_tenant on public.bericht_lesebestaetigungen
  for select using (
    exists (select 1 from public.berichte b where b.id = bericht_id and b.tenant_id = public.current_tenant_id())
  );
create policy lesb_insert_self on public.bericht_lesebestaetigungen
  for insert with check (user_id = auth.uid());

-- ==== BEWOHNER / ANWEISUNGEN / TERMINE =====================================
create policy bew_select_tenant on public.bewohner
  for select using (tenant_id = public.current_tenant_id());
create policy bew_modify_admin_leitung on public.bewohner
  for all using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung())
  with check (tenant_id = public.current_tenant_id());

create policy anw_select_tenant on public.anweisungen
  for select using (tenant_id = public.current_tenant_id());
create policy anw_modify_admin_leitung on public.anweisungen
  for all using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung())
  with check (tenant_id = public.current_tenant_id());

create policy term_select_tenant on public.termine
  for select using (tenant_id = public.current_tenant_id());
create policy term_modify_tenant on public.termine
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- ==== PINNWAND ==============================================================
create policy pin_select_tenant on public.pinnwand
  for select using (tenant_id = public.current_tenant_id());
create policy pin_modify_admin_leitung on public.pinnwand
  for all using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung())
  with check (tenant_id = public.current_tenant_id());

create policy pin_lesb_select_tenant on public.pinnwand_lesebestaetigungen
  for select using (
    exists (select 1 from public.pinnwand p where p.id = pinnwand_id and p.tenant_id = public.current_tenant_id())
  );
create policy pin_lesb_insert_self on public.pinnwand_lesebestaetigungen
  for insert with check (user_id = auth.uid());

-- ==== SCHICHTVORLAGEN =======================================================
create policy vor_select_tenant on public.schichtvorlagen
  for select using (tenant_id = public.current_tenant_id());
create policy vor_modify_admin_leitung on public.schichtvorlagen
  for all using (tenant_id = public.current_tenant_id() and public.is_admin_or_leitung())
  with check (tenant_id = public.current_tenant_id());

-- ==== AUDIT LOG (read-only für Admin) =======================================
create policy audit_select_admin on public.audit_log
  for select using (tenant_id = public.current_tenant_id() and public.is_admin());
-- INSERT nur via Service-Role / Trigger
