-- Prepared for local review. Do not apply to a hosted project without approval.
begin;
create table public.app_schema (id integer primary key check (id = 1), version integer not null);
insert into public.app_schema values (1, 1);
alter table public.app_schema enable row level security;
grant select on public.app_schema to anon, authenticated;
create policy schema_read on public.app_schema for select to anon, authenticated using (true);

create table public.exercises (
  id text primary key, name text not null, equipment text not null,
  muscle_groups text[] not null, movement_pattern text not null, instructions text not null
);
alter table public.exercises enable row level security;
grant select on public.exercises to anon, authenticated;
create policy catalog_read on public.exercises for select to anon, authenticated using (true);

create table public.routine_templates (
  id uuid not null, owner_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null, revision bigint not null check (revision > 0),
  name text not null check (length(trim(name)) between 1 and 80),
  goal text not null check (goal in ('stay_active','consistency','strength_muscle','balanced')),
  deleted_at timestamptz, updated_at timestamptz not null default now(),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'), primary key (owner_id, id)
);
create table public.routine_exercises (
  id uuid not null, owner_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null, exercise_id text not null references public.exercises(id),
  position integer not null check (position between 0 and 29), target_sets integer not null check (target_sets between 1 and 10),
  rep_min integer not null check (rep_min between 1 and 100), rep_max integer not null check (rep_max between rep_min and 100),
  target_rir numeric check (target_rir between 0 and 10),
  primary key (owner_id, id), unique (owner_id, template_id, position),
  foreign key (owner_id, template_id) references public.routine_templates(owner_id, id) on delete cascade
);
create table public.workout_sessions (
  id uuid not null, owner_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null, revision bigint not null check (revision > 0), template_id uuid,
  name text not null check (length(trim(name)) between 1 and 80),
  status text not null check (status in ('active','paused','finished')),
  load_unit text not null check (load_unit in ('kg','lb')),
  started_at timestamptz not null, finished_at timestamptz, deleted_at timestamptz,
  note text not null check (length(note) <= 2000), updated_at timestamptz not null default now(),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  primary key (owner_id, id), unique (owner_id, id, load_unit),
  foreign key (owner_id, template_id) references public.routine_templates(owner_id, id),
  check ((status = 'finished') = (finished_at is not null)), check (finished_at is null or finished_at >= started_at)
);
create table public.workout_exercises (
  id uuid not null, owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null, exercise_id text not null references public.exercises(id),
  position integer not null check (position between 0 and 29), target_sets integer not null check (target_sets between 1 and 10),
  rep_min integer not null check (rep_min between 1 and 100), rep_max integer not null check (rep_max between rep_min and 100),
  target_rir numeric check (target_rir between 0 and 10),
  load_unit text not null check (load_unit in ('kg','lb')),
  technique_confirmed boolean not null, safety_flag boolean not null,
  primary key (owner_id, id), unique (owner_id, session_id, position), unique (owner_id, id, load_unit),
  foreign key (owner_id, session_id, load_unit) references public.workout_sessions(owner_id, id, load_unit) on delete cascade on update cascade
);
create table public.workout_sets (
  id uuid not null, owner_id uuid not null references auth.users(id) on delete cascade,
  workout_exercise_id uuid not null, ordinal integer not null check (ordinal between 1 and 20),
  load numeric check (load between 0 and 1000), reps integer check (reps between 1 and 100), rir numeric check (rir between 0 and 10),
  load_unit text not null check (load_unit in ('kg','lb')),
  completed_at timestamptz, note text not null check (length(note) <= 1000),
  primary key (owner_id, id), unique (owner_id, workout_exercise_id, ordinal),
  foreign key (owner_id, workout_exercise_id, load_unit) references public.workout_exercises(owner_id, id, load_unit) on delete cascade on update cascade,
  check (completed_at is null or (load is not null and reps is not null))
);

-- RLS checks both existing and replacement ownership. Composite FKs reject cross-owner parents.
do $$ declare tbl text; begin
  foreach tbl in array array['routine_templates','routine_exercises','workout_sessions','workout_exercises','workout_sets'] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on public.%I from anon, authenticated', tbl);
    execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
    execute format('create policy own_rows on public.%I for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', tbl);
  end loop;
end $$;
-- Remove project-dependent default write grants on public metadata tables too.
revoke insert, update, delete, truncate, references, trigger on public.exercises, public.app_schema from anon, authenticated;
commit;
