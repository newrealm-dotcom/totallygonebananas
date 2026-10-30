-- SECURITY DEFINER functions inherit EXECUTE from PUBLIC unless it is revoked there.

revoke execute on function public.current_role_is(public.user_role[]) from public;
grant execute on function public.current_role_is(public.user_role[]) to authenticated, service_role;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.protect_profile_role() from public;
