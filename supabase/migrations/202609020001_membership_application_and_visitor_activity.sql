-- 会员申请改为人工到账核验：前台不再收集付款截图或订单号。
drop policy if exists "Users can insert own orders" on public.membership_orders;
create policy "Users can insert own orders"
  on public.membership_orders for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and proof_path is null
    and (
      (plan_id = 'month' and plan_name = '月度会员' and amount = 29.00)
      or
      (plan_id = 'year' and plan_name = '年度会员' and amount = 285.00)
    )
  );

-- 仅向管理员返回脱敏后的近期行为，不暴露账号 ID、报价参数或用户输入。
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
      'page_view',
      'calculation_completed',
      'save_quote_click',
      'payment_application_submitted'
    )
  order by event.created_at desc
  limit least(greatest(coalesce(p_limit, 80), 1), 200);
$$;

revoke all on function public.get_recent_visitor_activity(integer) from public;
grant execute on function public.get_recent_visitor_activity(integer) to authenticated;
