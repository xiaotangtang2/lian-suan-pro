-- 每日访客统计：已登录用户按账号去重，未登录用户按匿名浏览器标识去重。
-- 所有边界都以中国时区（Asia/Shanghai）的自然日计算。

drop policy if exists "Visitors can add analytics events" on public.analytics_events;
create policy "Visitors can add own analytics events"
  on public.analytics_events for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

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
    select visitor_id, user_id
    from public.analytics_events
    where event_name = 'site_visit' and created_at >= day_start
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
