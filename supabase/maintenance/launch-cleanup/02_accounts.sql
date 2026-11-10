-- =============================================================================
-- Wasel launch cleanup — 02 · ACCOUNT REVIEW (read-only)
-- =============================================================================
-- One row per account, so a person can decide which accounts are test accounts
-- and which (if any) belong to real people and must be kept.
--
-- `looks_like_test` is only a hint (example.com / test / demo / e2e addresses,
-- or never signed in). It is never used by the cleanup script itself: the
-- script deletes every account except the ones explicitly listed to keep, and
-- only when the approved count matches exactly.
-- =============================================================================

begin transaction read only;

select
  u.id,
  u.email,
  u.created_at::date as created,
  u.last_sign_in_at::date as last_sign_in,
  coalesce(u.raw_app_meta_data ->> 'provider', '?') as provider,
  u.email_confirmed_at is not null as confirmed,
  u.is_anonymous as anonymous,
  (select count(*) from public.conversations c where c.user_id = u.id) as conversations,
  (select count(*) from public.complaints k where k.user_id = u.id) as complaints,
  (select count(*) from public.complaints k where k.user_id = u.id and k.submitted_at is not null) as marked_submitted,
  (
    coalesce(u.email, '') ~* '(@example\.(com|org)$|test|demo|e2e|visual|qa\b|\+)'
    or u.last_sign_in_at is null
  ) as looks_like_test
from auth.users u
order by u.created_at;

rollback;
