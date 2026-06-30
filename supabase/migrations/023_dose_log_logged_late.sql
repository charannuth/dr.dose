-- "Redeem your streak": lets a user mark a missed dose from the previous calendar
-- day as taken after the fact. Such logs are flagged so the UI can permanently
-- show they were marked late (and the streak calendar can stripe that day).

alter table public.dose_logs
  add column if not exists logged_late boolean not null default false;

comment on column public.dose_logs.logged_late is
  'true when this dose was marked taken on a later calendar day than taken_on (a redeemed/late entry).';
