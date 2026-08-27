-- Explicit table privileges for the institution tables.
--
-- RLS is only consulted *after* table-level GRANTs: a policy cannot grant
-- access that the role does not already hold. The two earlier migrations
-- created these tables without declaring any grants, which happened to work on
-- the hosted project because its default privileges cover new public tables —
-- but it silently fails anywhere those defaults differ. Reproduced on a local
-- `supabase start` stack, where the roles received only REFERENCES/TRIGGER/
-- TRUNCATE and every read failed with "permission denied for table
-- institution_members".
--
-- Declaring them here makes the schema self-contained and portable.

grant select on public.institutions        to anon, authenticated;
grant select on public.institution_members to anon, authenticated;

-- Backs the "Members can leave" policy — a student can detach themselves from
-- a college and stop being tracked. Without the grant that policy is dead.
grant delete on public.institution_members to authenticated;

-- Note the omissions: no INSERT or UPDATE for anon/authenticated. Enrolment
-- goes exclusively through join_institution(), which is SECURITY DEFINER and
-- therefore needs no client-side privilege. Withholding them is defence in
-- depth — a future mis-written policy still cannot let a client write these
-- tables directly.

grant all on public.institutions        to service_role;
grant all on public.institution_members to service_role;
