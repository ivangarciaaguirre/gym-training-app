begin;
-- A single RPC commits parent and children atomically. It runs as the caller, with RLS.
create function public.save_training_record(record_kind text, payload jsonb, client_device uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid(); record_id uuid := (payload->>'id')::uuid;
  rev bigint := (payload->>'revision')::bigint; row_count integer;
  child jsonb; logged_set jsonb; pos integer := 0;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if client_device is null or jsonb_typeof(payload) <> 'object' or octet_length(payload::text) > 262144 then raise exception 'Invalid payload'; end if;
  if record_kind = 'routine' then
    if jsonb_typeof(payload->'entries') is distinct from 'array' or jsonb_array_length(payload->'entries') > 30 then raise exception 'Invalid entries'; end if;
    insert into public.routine_templates(id, owner_id, device_id, revision, name, goal, deleted_at, snapshot)
    values(record_id, uid, client_device, rev, payload->>'name', payload->>'goal', (payload->>'deletedAt')::timestamptz, payload)
    on conflict (owner_id, id) do update set revision = excluded.revision, name = excluded.name, goal = excluded.goal,
      deleted_at = excluded.deleted_at, snapshot = excluded.snapshot, updated_at = now()
      where routine_templates.device_id = client_device and routine_templates.revision < rev;
    get diagnostics row_count = row_count;
    if row_count = 0 then
      if exists(select 1 from public.routine_templates where owner_id = uid and id = record_id and device_id <> client_device) then raise exception 'Different device owns this record'; end if;
      return; -- Duplicate or older revision: safe retry, never overwrite newer facts.
    end if;
    delete from public.routine_exercises where owner_id = uid and template_id = record_id;
    for child in select value from jsonb_array_elements(payload->'entries') loop
      insert into public.routine_exercises(id, owner_id, template_id, exercise_id, position, target_sets, rep_min, rep_max, target_rir)
      values((child->>'id')::uuid, uid, record_id, child->>'exerciseId', pos, (child->>'targetSets')::integer,
        (child->>'repMin')::integer, (child->>'repMax')::integer, (child->>'targetRir')::numeric);
      pos := pos + 1;
    end loop;
  elsif record_kind = 'workout' then
    if jsonb_typeof(payload->'exercises') is distinct from 'array' or jsonb_array_length(payload->'exercises') > 30 then raise exception 'Invalid exercises'; end if;
    insert into public.workout_sessions(id, owner_id, device_id, revision, template_id, name, status, load_unit, started_at, finished_at, deleted_at, note, snapshot)
    values(record_id, uid, client_device, rev, (payload->>'templateId')::uuid, payload->>'name', payload->>'status', payload->>'unit',
      (payload->>'startedAt')::timestamptz, (payload->>'finishedAt')::timestamptz, (payload->>'deletedAt')::timestamptz, payload->>'note', payload)
    on conflict (owner_id, id) do update set revision = excluded.revision, status = excluded.status, finished_at = excluded.finished_at,
      name = excluded.name, template_id = excluded.template_id, load_unit = excluded.load_unit, started_at = excluded.started_at,
      deleted_at = excluded.deleted_at, note = excluded.note, snapshot = excluded.snapshot, updated_at = now()
      where workout_sessions.device_id = client_device and workout_sessions.revision < rev;
    get diagnostics row_count = row_count;
    if row_count = 0 then
      if exists(select 1 from public.workout_sessions where owner_id = uid and id = record_id and device_id <> client_device) then raise exception 'Different device owns this record'; end if;
      return;
    end if;
    delete from public.workout_exercises where owner_id = uid and session_id = record_id;
    for child in select value from jsonb_array_elements(payload->'exercises') loop
      if jsonb_typeof(child->'sets') is distinct from 'array' or jsonb_array_length(child->'sets') > 20 then raise exception 'Invalid sets'; end if;
      insert into public.workout_exercises(id, owner_id, session_id, exercise_id, position, target_sets, rep_min, rep_max, target_rir, load_unit, technique_confirmed, safety_flag)
      values((child->>'id')::uuid, uid, record_id, child->>'exerciseId', pos, (child->>'targetSets')::integer, (child->>'repMin')::integer,
        (child->>'repMax')::integer, (child->>'targetRir')::numeric, payload->>'unit', (child->>'techniqueConfirmed')::boolean, (child->>'safetyFlag')::boolean);
      pos := pos + 1;
      for logged_set in select value from jsonb_array_elements(child->'sets') loop
        if logged_set->>'completedAt' is not null and (logged_set->>'reps')::numeric <> trunc((logged_set->>'reps')::numeric) then raise exception 'Reps must be whole numbers'; end if;
        insert into public.workout_sets(id, owner_id, workout_exercise_id, ordinal, load, reps, rir, load_unit, completed_at, note)
        values((logged_set->>'id')::uuid, uid, (child->>'id')::uuid, (logged_set->>'ordinal')::integer,
          case when logged_set->>'completedAt' is not null then (logged_set->>'load')::numeric end,
          case when logged_set->>'completedAt' is not null then (logged_set->>'reps')::numeric::integer end,
          case when logged_set->>'completedAt' is not null then nullif(trim(logged_set->>'rir'),'')::numeric end,
          payload->>'unit', (logged_set->>'completedAt')::timestamptz, logged_set->>'note');
      end loop;
    end loop;
  else raise exception 'Invalid record kind'; end if;
end $$;
revoke all on function public.save_training_record(text, jsonb, uuid) from public, anon;
grant execute on function public.save_training_record(text, jsonb, uuid) to authenticated;
commit;
