import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { Text, View } from 'react-native';
import { recommendProgression } from '@gym/training-engine';
import { useStore } from '../../store';
import { exerciseName } from '../../data/catalog';
import { parseSet, previousExercise, type Workout, type WorkoutExercise, type WorkoutSet } from '../../data/model';
import { Button, Field, Screen, Toggle, styles, useAction, confirm } from '../../ui';
export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { repo, save } = useStore(); const { error, run } = useAction();
  const workouts = repo.workouts(), workout = workouts.find(w => w.id === id);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  if (!workout) return <Screen title="Workout unavailable"><Text style={styles.text}>This workout may have been deleted.</Text></Screen>;
  const w = workout, editable = w.status === 'active';
  const patch = (change: Partial<Workout>) => run(() => save('workout', { ...w, ...change, revision: w.revision + 1 }));
  function editExercise(exercise: WorkoutExercise, change: Partial<WorkoutExercise>) { patch({ exercises: w.exercises.map(e => e.id === exercise.id ? { ...e, ...change } : e) }); }
  function editSet(e: WorkoutExercise, set: WorkoutSet, change: Partial<WorkoutSet>) { editExercise(e, { sets: e.sets.map(s => s.id === set.id ? { ...s, ...change } : s) }); }
  const completed = w.exercises.flatMap(e => e.sets).filter(s => s.completedAt).length;
  const rest = w.restUntil ? Math.max(0, Math.ceil((Date.parse(w.restUntil) - now) / 1000)) : 0;
  return <Screen title={w.name}>
    <Text style={styles.text}>{w.status} · {w.unit} · {completed} logged sets</Text>
    <Text style={styles.muted}>Use total external load for barbells/machines and combined dumbbell load. Use 0 for unloaded movements. RIR = estimated reps left; optional.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {w.status !== 'finished' ? <View style={styles.row}>
      <Button secondary title={editable ? 'Pause workout' : 'Resume workout'} onPress={() => patch({ status: editable ? 'paused' : 'active' })} />
      <Button title="Finish workout" disabled={completed === 0} onPress={() => confirm('Finish workout?', 'Only sets marked complete count as logged. Unfinished input will be retained in history.', () => {
        run(() => { save('workout', { ...w, status: 'finished', finishedAt: new Date().toISOString(), restUntil: null, revision: w.revision + 1 }); router.replace('/history'); });
      })} />
      <Button secondary title="Discard workout" onPress={() => confirm('Discard workout?', 'This session will leave the workout list.', () => run(() => { save('workout', { ...w, deletedAt: new Date().toISOString(), revision: w.revision + 1 }); router.replace('/'); }))} />
    </View> : null}
    {w.restUntil ? <View style={styles.card}><Text style={styles.heading}>{rest ? `Rest: ${rest}s` : 'Rest timer complete'}</Text><Button secondary title="Clear timer" onPress={() => patch({ restUntil: null })} /></View> : null}
    <Field label="Workout note" value={w.note} maxLength={2000} multiline editable={editable} onChangeText={note => patch({ note })} />
    {w.exercises.map(e => {
      const previous = previousExercise(workouts, w, e);
      const logged = e.sets.filter(s => s.completedAt).map(parseSet).filter(s => s !== null);
      const recommendation = recommendProgression({ sets: logged, targetSets: e.targetSets, repMin: e.repMin, repMax: e.repMax, unit: w.unit,
        techniqueConfirmed: e.techniqueConfirmed, safetyFlag: e.safetyFlag || /\b(pain|discomfort|dizz(?:y|iness))\b/i.test([w.note, ...e.sets.map(s => s.note)].join(' ')) });
      return <View key={e.id} style={styles.card}><Text style={styles.heading}>{exerciseName(e.exerciseId)}</Text>
        <Text style={styles.muted}>{e.targetSets} sets × {e.repMin}–{e.repMax} reps{e.targetRir !== null ? ` · target RIR ${e.targetRir}` : ''}</Text>
        {e.sets.map(s => {
          const prev = previous?.sets.find(p => p.ordinal === s.ordinal && p.completedAt);
          const writable = editable && !s.completedAt;
          return <View key={s.id} style={{ gap: 10, paddingVertical: 10, borderTopWidth: 1, borderColor: '#e1e5df' }}>
            <Text style={styles.text}>Set {s.ordinal}{s.completedAt ? ' · logged ✓' : ' · unfinished'}</Text>
            <Text style={styles.muted}>{prev ? `Previous: ${prev.load} ${w.unit} × ${prev.reps}${prev.rir ? ` · RIR ${prev.rir}` : ''}` : `No previous comparable set in ${w.unit}.`}</Text>
            {prev && writable ? <Button secondary title="Fill previous values" onPress={() => editSet(e, s, { load: prev.load, reps: prev.reps, rir: prev.rir })} /> : null}
            <View style={styles.row}>
              <Field label={`Set ${s.ordinal} load (${w.unit})`} keyboardType="decimal-pad" maxLength={20} value={s.load} editable={writable} onChangeText={load => editSet(e, s, { load })} />
              <Field label={`Set ${s.ordinal} reps`} keyboardType="number-pad" maxLength={20} value={s.reps} editable={writable} onChangeText={reps => editSet(e, s, { reps })} />
              <Field label={`Set ${s.ordinal} RIR (optional)`} keyboardType="decimal-pad" maxLength={20} value={s.rir} editable={writable} onChangeText={rir => editSet(e, s, { rir })} />
            </View>
            <Field label={`Set ${s.ordinal} note (optional)`} value={s.note} maxLength={1000} editable={editable} onChangeText={note => editSet(e, s, { note })} />
            {editable ? <Button secondary={!!s.completedAt} title={s.completedAt ? 'Edit logged set' : 'Complete set & rest 90s'} onPress={() => {
              if (s.completedAt) { editSet(e, s, { completedAt: null }); return; }
              run(() => {
                if (!parseSet(s)) throw new Error('Enter load from 0–1000, whole reps from 1–100, and optional RIR from 0–10.');
                save('workout', { ...w, revision: w.revision + 1, restUntil: new Date(Date.now() + 90_000).toISOString(),
                  exercises: w.exercises.map(x => x.id === e.id ? { ...e, sets: e.sets.map(x => x.id === s.id ? { ...s, completedAt: new Date().toISOString() } : x) } : x) });
              });
            }} /> : null}
          </View>;
        })}
        {editable ? <Button secondary title="Add set" disabled={e.sets.length >= 20} onPress={() => editExercise(e, { sets: [...e.sets, { id: randomUUID(), ordinal: e.sets.length + 1, load: '', reps: '', rir: '', note: '', completedAt: null }] })} /> : null}
        <Toggle label="Technique felt comfortable" value={e.techniqueConfirmed} disabled={!editable} onChange={techniqueConfirmed => editExercise(e, { techniqueConfirmed })} />
        <Toggle label="Pain, discomfort or dizziness" value={e.safetyFlag} disabled={!editable} onChange={safetyFlag => editExercise(e, { safetyFlag })} />
        {w.status === 'finished' ? <View style={{ gap: 6 }}><Text style={styles.text}>{recommendation.explanation}</Text>
          {recommendation.suggestedLoad ? <Text style={styles.text}>Consider {recommendation.suggestedLoad} {w.unit} next time.</Text> : null}
          <Text style={styles.muted}>Uncertainty: {recommendation.uncertainty}. {recommendation.limitations.join(' ')}</Text></View> : null}
      </View>;
    })}
  </Screen>;
}
