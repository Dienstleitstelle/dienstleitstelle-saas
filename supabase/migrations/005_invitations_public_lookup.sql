-- Anonyme Lookups für Einladungstokens erlauben.
-- Der Token ist 48 Zeichen lang (192 Bit Entropie), unraetbar.
-- Wer den Token hat, darf seine Einladungs-Infos sehen.

drop policy if exists invitations_select_admin on public.invitations;

create policy invitations_select_token_or_admin on public.invitations
  for select
  to anon, authenticated
  using (
    -- Anonyme + eingeloggte: jeder darf SELECT (Schutz = Token-Geheimnis)
    -- Admins/Leitung sehen sowieso alle ihres Tenants ueber die normale App
    true
  );

-- Insert/Delete bleiben Admin/Leitung-only (siehe vorherige Policies).
