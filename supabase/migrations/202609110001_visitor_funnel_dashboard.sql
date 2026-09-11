-- 访客转化概览：仅向管理员返回聚合后的事件数量和匿名访客数量。
-- 不返回邮箱、用户 ID、IP、设备信息、报价参数或用户输入。
create or replace function public.get_visitor_funnel_summary(p_days integer default 1)
returns table (
  metric_key text,
  metric_label text,
  event_count bigint,
  visitor_count bigint
)
language sql
security definer
set search_path = public
as $$
  with metric_definitions(metric_key, metric_label) as (
    values
      ('page_view', '浏览页面'),
      ('calculation_completed', '完成计算'),
      ('save_quote_click', '点击保存报价'),
      ('registration_submitted', '提交注册'),
      ('login_success', '登录成功'),
      ('payment_application_submitted', '提交会员申请')
  ), recent_events as (
    select event_name, visitor_id
    from public.analytics_events
    where created_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 1), 1), 31))
      and event_name in (select metric_key from metric_definitions)
  )
  select
    definition.metric_key,
    definition.metric_label,
    count(event.event_name)::bigint as event_count,
    count(distinct event.visitor_id)::bigint as visitor_count
  from metric_definitions as definition
  left join recent_events as event on event.event_name = definition.metric_key
  where public.is_admin() is true
  group by definition.metric_key, definition.metric_label
  order by array_position(array[
    'page_view', 'calculation_completed', 'save_quote_click',
    'registration_submitted', 'login_success', 'payment_application_submitted'
  ], definition.metric_key);
$$;

revoke all on function public.get_visitor_funnel_summary(integer) from public;
grant execute on function public.get_visitor_funnel_summary(integer) to authenticated;

-- 最近行为明细同样只展示动作和页面/工具代号，扩展为完整的转化动作集合。
create or replace function public.get_recent_visitor_activity(p_limit integer default 80)
returns table (
  occurred_at timestamptz,
  event_name text,
  page_path text,
  tool_slug text,
  visitor_kind text
)
language sql
security definer
set search_path = public
as $$
  select
    event.created_at as occurred_at,
    event.event_name,
    coalesce(event.properties ->> 'path', '') as page_path,
    coalesce(event.properties ->> 'tool', '') as tool_slug,
    case when event.user_id is null then 'anonymous' else 'account' end as visitor_kind
  from public.analytics_events as event
  where public.is_admin() is true
    and event.event_name in (
      'page_view', 'calculation_completed', 'save_quote_click',
      'article_tool_click', 'tool_login_click', 'free_start_click',
      'hero_quote_click', 'registration_submitted', 'login_success',
      'payment_application_submitted'
    )
  order by event.created_at desc
  limit least(greatest(coalesce(p_limit, 80), 1), 200);
$$;

revoke all on function public.get_recent_visitor_activity(integer) from public;
grant execute on function public.get_recent_visitor_activity(integer) to authenticated;
