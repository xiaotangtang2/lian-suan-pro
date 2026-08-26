-- AI 成本控制：不保存用户 Prompt，只记录调用计数、Token 用量与结果状态。

create table if not exists public.ai_usage_settings (
  singleton boolean primary key default true check (singleton),
  daily_limit integer not null default 20 check (daily_limit between 1 and 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.ai_usage_settings (singleton, daily_limit)
values (true, 20)
on conflict (singleton) do nothing;

create table if not exists public.ai_usage_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  input_chars integer not null default 0,
  output_chars integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  status text not null check (status in ('processing', 'success', 'failed')),
  error_code text check (char_length(error_code) <= 80),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.ai_usage_settings enable row level security;
alter table public.ai_usage_logs enable row level security;

create index if not exists ai_usage_logs_user_time_idx
  on public.ai_usage_logs (user_id, created_at desc);
create index if not exists ai_usage_logs_time_status_idx
  on public.ai_usage_logs (created_at desc, status);

-- Edge Function 使用 service_role 调用；公开客户端不具备直接读写日志的权限。
create or replace function public.reserve_ai_request(p_user_id uuid, p_input_chars integer)
returns table (allowed boolean, request_id bigint, daily_limit integer, used_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  configured_limit integer;
  used integer;
  day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai';
  new_request_id bigint;
begin
  -- 锁定唯一设置行，让“计数 + 写入”串行，防止并发请求绕过每日限额。
  select daily_limit into configured_limit
  from public.ai_usage_settings
  where singleton = true
  for update;

  select count(*)::integer into used
  from public.ai_usage_logs
  where user_id = p_user_id
    and created_at >= day_start
    and status in ('processing', 'success', 'failed');

  if used >= configured_limit then
    return query select false, null::bigint, configured_limit, used;
    return;
  end if;

  insert into public.ai_usage_logs (user_id, input_chars, input_tokens, status)
  values (
    p_user_id,
    greatest(p_input_chars, 0),
    -- 仅作为兜底预估；模型实际返回 usage 时会被完成步骤覆盖。
    ceil((greatest(p_input_chars, 0) + 180)::numeric / 1.5)::integer,
    'processing'
  )
  returning id into new_request_id;

  return query select true, new_request_id, configured_limit, used + 1;
end;
$$;

create or replace function public.complete_ai_request(
  p_request_id bigint,
  p_status text,
  p_output_chars integer default 0,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_error_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('success', 'failed') then
    raise exception '无效的 AI 调用状态';
  end if;

  update public.ai_usage_logs
  set status = p_status,
      output_chars = greatest(coalesce(p_output_chars, 0), 0),
      input_tokens = coalesce(p_input_tokens, input_tokens),
      output_tokens = coalesce(p_output_tokens, ceil(greatest(coalesce(p_output_chars, 0), 0)::numeric / 1.5)::integer),
      error_code = left(nullif(trim(p_error_code), ''), 80),
      completed_at = now()
  where id = p_request_id and status = 'processing';
end;
$$;

create or replace function public.get_ai_control_settings()
returns table (daily_limit integer, input_char_limit integer, output_token_limit integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() is not true then
    raise exception '无权限：仅管理员可查看 AI 设置';
  end if;

  return query
  select daily_limit, 2000, 700
  from public.ai_usage_settings
  where singleton = true;
end;
$$;

create or replace function public.update_ai_daily_limit(p_daily_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare updated_limit integer;
begin
  if public.is_admin() is not true then
    raise exception '无权限：仅管理员可修改 AI 设置';
  end if;
  if p_daily_limit is null or p_daily_limit not between 1 and 1000 then
    raise exception '每日调用次数必须在 1 到 1000 之间';
  end if;

  update public.ai_usage_settings
  set daily_limit = p_daily_limit, updated_at = now(), updated_by = auth.uid()
  where singleton = true
  returning daily_limit into updated_limit;

  return updated_limit;
end;
$$;

create or replace function public.get_today_ai_stats()
returns table (call_count bigint, estimated_tokens bigint, failed_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai';
begin
  if public.is_admin() is not true then
    raise exception '无权限：仅管理员可查看 AI 统计';
  end if;

  return query
  select
    count(*) filter (where status in ('processing', 'success', 'failed')),
    coalesce(sum(input_tokens + output_tokens), 0),
    count(*) filter (where status = 'failed')
  from public.ai_usage_logs
  where created_at >= day_start;
end;
$$;

revoke all on function public.reserve_ai_request(uuid, integer) from public, anon, authenticated;
revoke all on function public.complete_ai_request(bigint, text, integer, integer, integer, text) from public, anon, authenticated;
grant execute on function public.reserve_ai_request(uuid, integer) to service_role;
grant execute on function public.complete_ai_request(bigint, text, integer, integer, integer, text) to service_role;

revoke all on function public.get_ai_control_settings() from public;
revoke all on function public.update_ai_daily_limit(integer) from public;
revoke all on function public.get_today_ai_stats() from public;
grant execute on function public.get_ai_control_settings() to authenticated;
grant execute on function public.update_ai_daily_limit(integer) to authenticated;
grant execute on function public.get_today_ai_stats() to authenticated;
