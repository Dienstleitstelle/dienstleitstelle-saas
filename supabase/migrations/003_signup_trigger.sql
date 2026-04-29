-- ==========================================================================
-- TRIGGER: Wenn ein neuer auth.users entsteht, der via Einladung kam,
-- legen wir automatisch ein profile mit der eingeladenen Rolle + Tenant an.
-- Wer ohne Einladung kommt, wird im /signup-Schritt zum Admin eines neuen Tenants
-- gemacht (das passiert serverseitig via API-Route, nicht via Trigger).
-- ==========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inv public.invitations%rowtype;
begin
  -- Falls user_metadata.invitation_token gesetzt ist → Einladung verarbeiten
  if new.raw_user_meta_data ? 'invitation_token' then
    select * into inv
    from public.invitations
    where token = new.raw_user_meta_data->>'invitation_token'
      and accepted_at is null
      and expires_at > now()
    limit 1;

    if found then
      insert into public.profiles (id, tenant_id, rolle, vorname, nachname, email)
      values (
        new.id,
        inv.tenant_id,
        inv.rolle,
        coalesce(inv.vorname, new.raw_user_meta_data->>'vorname'),
        coalesce(inv.nachname, new.raw_user_meta_data->>'nachname'),
        new.email
      );

      update public.invitations
      set accepted_at = now()
      where id = inv.id;

      return new;
    end if;
  end if;

  -- Sonst nur Email speichern, der Rest passiert beim Onboarding (Tenant-Anlage)
  insert into public.profiles (id, rolle, email, vorname, nachname)
  values (
    new.id,
    'admin',  -- vorläufig; wird beim Tenant-Onboarding gesetzt
    new.email,
    new.raw_user_meta_data->>'vorname',
    new.raw_user_meta_data->>'nachname'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==========================================================================
-- RPC: Tenant beim ersten Login anlegen
-- Wird von /onboarding aufgerufen, wenn ein User noch keinen tenant_id hat
-- ==========================================================================

create or replace function public.create_tenant_for_user(
  p_firma   text,
  p_bundesland text default 'BW',
  p_branche  text default 'standard'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_tenant_id uuid;
  v_existing_tenant uuid;
begin
  -- Prüfen, ob User schon einen Tenant hat
  select tenant_id into v_existing_tenant from public.profiles where id = auth.uid();
  if v_existing_tenant is not null then
    raise exception 'User hat bereits einen Tenant';
  end if;

  insert into public.tenants (name, bundesland, branche)
  values (p_firma, p_bundesland, p_branche)
  returning id into v_tenant_id;

  update public.profiles
    set tenant_id = v_tenant_id, rolle = 'admin'
    where id = auth.uid();

  insert into public.audit_log (tenant_id, actor_id, aktion, entitaet, entitaet_id)
  values (v_tenant_id, auth.uid(), 'tenant_created', 'tenants', v_tenant_id);

  return v_tenant_id;
end;
$$;

grant execute on function public.create_tenant_for_user(text, text, text) to authenticated;
