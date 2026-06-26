-- Account deletion (App Store Review Guideline 5.1.1(v))
-- Lets a signed-in user permanently delete their own account and all of their
-- data from inside the app. Every user-data table references
-- auth.users(id) on delete cascade, so removing the auth.users row also removes
-- medications, dose logs, wellness entries, medical records, tracking, and
-- doctor visits for that user.
--
-- Runs as SECURITY DEFINER so the authenticated caller can delete their own
-- auth.users row. It only ever deletes the row matching auth.uid(), so a user
-- can never delete another account.

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;
