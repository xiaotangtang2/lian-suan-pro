create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (char_length(event_name) <= 80),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.analytics_events enable row level security;
create policy "Visitors can add analytics events" on public.analytics_events for insert to anon, authenticated with check (true);
create policy "Admins can read analytics events" on public.analytics_events for select to authenticated using (public.is_admin());
create index if not exists analytics_events_name_time_idx on public.analytics_events(event_name, created_at desc);
