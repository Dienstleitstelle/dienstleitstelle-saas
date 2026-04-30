-- Helper-RPC um auth.users per E-Mail zu finden (security definer)
create or replace function public.find_auth_user_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

grant execute on function public.find_auth_user_by_email(text) to anon, authenticated, service_role;

-- Helper-RPC um eine Einladung beim Akzeptieren zu finalisieren:
-- - markiert sie als accepted
-- - verlinkt profile (tenant, rolle, mitarbeiter)
-- - verlinkt mitarbeiter.user_id
create or replace function public.accept_invitation(p_token text, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inv public.invitations%rowtype;
begin
  select * into inv from public.invitations
   where token = p_token
     and accepted_at is null
     and expires_at > now()
   limit 1;
  if not found then return false; end if;

  insert into public.profiles (id, tenant_id, rolle, vorname, nachname, mitarbeiter_id)
  values (p_user_id, inv.tenant_id, inv.rolle, inv.vorname, inv.nachname, inv.mitarbeiter_id)
  on conflict (id) do update
    set tenant_id = excluded.tenant_id,
        rolle = excluded.rolle,
        mitarbeiter_id = coalesce(excluded.mitarbeiter_id, public.profiles.mitarbeiter_id),
        vorname = coalesce(excluded.vorname, public.profiles.vorname),
        nachname = coalesce(excluded.nachname, public.profiles.nachname);

  if inv.mitarbeiter_id is not null then
    update public.mitarbeiter set user_id = p_user_id where id = inv.mitarbeiter_id;
  end if;

  update public.invitations set accepted_at = now() where id = inv.id;
  return true;
end;
$$;

grant execute on function public.accept_invitation(text, uuid) to service_role;
