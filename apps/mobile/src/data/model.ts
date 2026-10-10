import { z } from 'zod';
import { catalog, type ExerciseId } from './catalog';
import type { LoggedSet } from '@gym/training-engine';

const uuid = z.string().uuid();
const timestamp = z.string().datetime();
const exerciseId = z.custom<ExerciseId>(value => catalog.some(e => e.id === value));
const targets = {
  id: uuid, exerciseId, targetSets: z.number().int().min(1).max(10),
  repMin: z.number().int().min(1).max(100), repMax: z.number().int().min(1).max(100),
  targetRir: z.number().min(0).max(10).nullable(),
};
const targetSchema = z.object(targets).refine(v => v.repMax >= v.repMin, 'Maximum reps must be at least minimum reps.');
export const goals = ['stay_active', 'consistency', 'strength_muscle', 'balanced'] as const;
export const routineSchema = z.object({
  id: uuid, name: z.string().trim().min(1).max(80), goal: z.enum(goals),
  revision: z.number().int().min(1), deletedAt: timestamp.nullable(), entries: z.array(targetSchema).max(30),
}).refine(v => new Set(v.entries.map(e => e.id)).size === v.entries.length, 'Duplicate routine entries.');
export const setSchema = z.object({
  id: uuid, ordinal: z.number().int().min(1).max(20), load: z.string().max(20),
  reps: z.string().max(20), rir: z.string().max(20), note: z.string().max(1000), completedAt: timestamp.nullable(),
});
export const workoutSchema = z.object({
  id: uuid, name: z.string().min(1).max(80), templateId: uuid.nullable(), status: z.enum(['active', 'paused', 'finished']),
  unit: z.enum(['kg', 'lb']), startedAt: timestamp, finishedAt: timestamp.nullable(),
  revision: z.number().int().min(1), deletedAt: timestamp.nullable(), note: z.string().max(2000),
  restUntil: timestamp.nullable(),
  exercises: z.array(z.object({ ...targets, techniqueConfirmed: z.boolean(), safetyFlag: z.boolean(), sets: z.array(setSchema).max(20) })
    .refine(v => v.repMax >= v.repMin)
    .refine(v => new Set(v.sets.map(s => s.id)).size === v.sets.length)
    .refine(v => v.sets.every((s, i) => s.ordinal === i + 1))).max(30),
}).refine(v => new Set(v.exercises.map(e => e.id)).size === v.exercises.length)
  .refine(v => {
    const ids = v.exercises.flatMap(e => e.sets.map(s => s.id));
    return new Set(ids).size === ids.length;
  }, 'Duplicate set IDs across exercises.')
  .refine(v => (v.status === 'finished') === (v.finishedAt !== null))
  .refine(v => v.exercises.every(e => e.sets.every(s => !s.completedAt || parseSet(s) !== null)), 'Completed sets must have valid values.');
export type Routine = z.infer<typeof routineSchema>;
export type RoutineEntry = Routine['entries'][number];
export type Workout = z.infer<typeof workoutSchema>;
export type WorkoutExercise = Workout['exercises'][number];
export type WorkoutSet = z.infer<typeof setSchema>;
export type RecordKind = 'routine' | 'workout';
export type TrainingRecord = Routine | Workout;

function numberInput(text: string): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(text.trim())) return null;
  const value = Number(text); return Number.isFinite(value) ? value : null;
}
export function parseSet(set: WorkoutSet): LoggedSet | null {
  const load = numberInput(set.load), reps = numberInput(set.reps), rir = set.rir.trim() ? numberInput(set.rir) : null;
  if (load === null || load > 1000 || reps === null || !Number.isInteger(reps) || reps < 1 || reps > 100 ||
    (set.rir.trim() && (rir === null || rir > 10))) return null;
  return { id: set.id, load, reps, rir };
}
export function previousExercise(history: Workout[], current: Workout, entry: WorkoutExercise): WorkoutExercise | undefined {
  return history.filter(w => w.id !== current.id && !w.deletedAt && w.status === 'finished' && w.unit === current.unit)
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
    .flatMap(w => w.exercises).find(e => e.exerciseId === entry.exerciseId && e.targetSets === entry.targetSets &&
      e.repMin === entry.repMin && e.repMax === entry.repMax && e.targetRir === entry.targetRir && e.sets.some(s => s.completedAt));
}
export function makeEntry(id: () => string, exercise: ExerciseId): RoutineEntry {
  return { id: id(), exerciseId: exercise, targetSets: 3, repMin: 6, repMax: 10, targetRir: null };
}
export function startWorkout(routine: Routine, unit: Workout['unit'], id: () => string): Workout {
  return { id: id(), name: routine.name, templateId: routine.id, unit, status: 'active', startedAt: new Date().toISOString(),
    finishedAt: null, deletedAt: null, note: '', revision: 1, restUntil: null,
    exercises: routine.entries.map(e => ({ ...e, id: id(), techniqueConfirmed: false, safetyFlag: false,
      sets: Array.from({ length: e.targetSets }, (_, i) => ({ id: id(), ordinal: i + 1, load: '', reps: '', rir: '', note: '', completedAt: null })) })),
  };
}
export function starterRoutines(id: () => string): Routine[] {
  const starters: { name: string; exercises: ExerciseId[] }[] = [
    { name: 'Upper A', exercises: ['bench', 'row', 'press', 'pulldown'] },
    { name: 'Lower A', exercises: ['squat', 'rdl', 'curl', 'calf'] },
    { name: 'Upper B', exercises: ['incline', 'pulldown', 'row', 'lateral'] },
    { name: 'Lower B', exercises: ['legpress', 'split', 'curl', 'calf'] },
  ];
  return starters.map(r => ({ id: id(), name: r.name, goal: 'balanced', entries: r.exercises.map(e => makeEntry(id, e)), revision: 1, deletedAt: null }));
}
