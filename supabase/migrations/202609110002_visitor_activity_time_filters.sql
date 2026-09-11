-- 后台访客记录按时间范围读取；仍只返回脱敏动作与路径，不返回任何身份或输入数据。
-- 移除旧的一参数版本，避免 PostgREST 在 RPC 调用时遇到同名函数歧义。
drop function if exists public.get_recent_visitor_activity(integer);

create or replace function public.get_recent_visitor_activity(
  p_limit integer default 80,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null
)
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
    and (p_start_at is null or event.created_at >= p_start_at)
    and (p_end_at is null or event.created_at < p_end_at)
    and event.event_name in (
      'page_view', 'calculation_completed', 'save_quote_click',
      'article_tool_click', 'tool_login_click', 'free_start_click',
      'hero_quote_click', 'registration_submitted', 'login_success',
      'payment_application_submitted'
    )
  order by event.created_at desc
  limit least(greatest(coalesce(p_limit, 80), 1), 200);
$$;

revoke all on function public.get_recent_visitor_activity(integer, timestamptz, timestamptz) from public;
grant execute on function public.get_recent_visitor_activity(integer, timestamptz, timestamptz) to authenticated;
