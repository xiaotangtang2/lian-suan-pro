-- 管理员不是网站访客：统计时排除管理员账号的当日到访记录。
-- 保留历史事件用于审计，但不再计入后台展示的访客人数。

create or replace function public.get_today_visitor_stats()
returns table (
  account_visitors bigint,
  anonymous_visitors bigint,
  total_visitors bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai';
begin
  if public.is_admin() is not true then
    raise exception '无权限：仅管理员可查看访客统计';
  end if;

  return query
  with today_visits as (
    select events.visitor_id, events.user_id
    from public.analytics_events as events
    left join public.profiles as profile on profile.id = events.user_id
    where events.event_name = 'site_visit'
      and events.created_at >= day_start
      and coalesce(profile.is_admin, false) is false
  ), account_ids as (
    select distinct user_id from today_visits where user_id is not null
  ), signed_in_devices as (
    select distinct visitor_id from today_visits where user_id is not null
  ), anonymous_ids as (
    select distinct visitor_id
    from today_visits
    where user_id is null and visitor_id not in (select visitor_id from signed_in_devices)
  )
  select
    (select count(*) from account_ids),
    (select count(*) from anonymous_ids),
    (select count(*) from account_ids) + (select count(*) from anonymous_ids);
end;
$$;

revoke all on function public.get_today_visitor_stats() from public;
grant execute on function public.get_today_visitor_stats() to authenticated;
