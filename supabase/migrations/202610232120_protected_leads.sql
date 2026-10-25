-- APPLY ONLY AFTER the Pages /api/leads gateway and Turnstile work in this environment.
-- The gateway uses a server-only secret; browsers cannot bypass CAPTCHA/rate limiting.
begin;
drop policy if exists "public insert owner_leads" on public.owner_leads;
revoke insert on public.owner_leads from anon, authenticated;
commit;
