-- 第一版会员体系：同一 PRO 权益，仅区分月付和年付。
-- 历史季度订单保留，但不再允许创建新的季度订单。
drop policy if exists "Users can insert own orders" on public.membership_orders;
create policy "Users can insert own orders"
  on public.membership_orders for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and proof_path is not null
    and proof_path like auth.uid()::text || '/%'
    and (
      (plan_id = 'month' and plan_name = '月度会员' and amount = 29.00)
      or
      (plan_id = 'year' and plan_name = '年度会员' and amount = 285.00)
    )
  );

create or replace function public.confirm_membership_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.membership_orders%rowtype;
  v_duration interval;
begin
  if public.is_admin() is not true then
    raise exception '无权限：仅管理员可确认收款';
  end if;

  select * into v_order from public.membership_orders where id = p_order_id;
  if not found then raise exception '订单不存在'; end if;
  if v_order.status = 'paid' then return true; end if;
  if v_order.status <> 'pending' then raise exception '订单当前状态不可确认'; end if;

  -- 兼容历史季度订单；新订单已由 RLS 限制为 month/year。
  v_duration := case v_order.plan_id
    when 'month' then interval '1 month'
    when 'quarter' then interval '3 months'
    when 'year' then interval '1 year'
    else null
  end;
  if v_duration is null then raise exception '不支持的会员周期'; end if;

  update public.membership_orders
     set status = 'paid', paid_at = now(), confirmed_at = now()
   where id = p_order_id;

  update public.profiles
     set is_member = true,
         member_expires_at = greatest(coalesce(member_expires_at, now()), now()) + v_duration
   where id = v_order.user_id;
  return true;
end;
$$;

grant execute on function public.confirm_membership_order(uuid) to authenticated;

