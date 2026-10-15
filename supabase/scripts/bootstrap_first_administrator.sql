-- =====================================================================
-- Create the FIRST Administrator (run once, in the Supabase SQL Editor).
--
-- 1. Supabase Dashboard -> Authentication -> Users -> Add user -> Create new user
--    Enter your email + a strong password and tick "Auto Confirm User".
-- 2. Replace the e-mail below with the same address and run this script.
--
-- This works only in the SQL Editor (or with the service role): the
-- profile guard trigger blocks every role change coming from a signed-in
-- user, so nobody can promote themselves from the website.
-- =====================================================================

update public.profiles
   set role = 'administrator',
       account_status = 'active',
       full_name = case when full_name = '' then 'System Administrator' else full_name end
 where lower(email) = lower('you@example.com');   -- <-- change this

-- Check: should return exactly one row with role = administrator
select id, email, role, account_status from public.profiles where role = 'administrator';
