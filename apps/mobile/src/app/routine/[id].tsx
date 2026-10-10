import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { Text, View } from 'react-native';
import { useStore } from '../../store';
import { catalog, exerciseName } from '../../data/catalog';
import { goals, makeEntry, routineSchema, type Routine } from '../../data/model';
import { Button, Field, Screen, styles, useAction, confirm } from '../../ui';
export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, save } = useStore(); const routine = repo.routines().find(r => r.id === id);
  if (!routine) return <Screen title="Routine unavailable"><Text style={styles.text}>This routine may have been deleted.</Text></Screen>;
  return <Editor initial={routine} save={r => save('routine', r)} />;
}
function Editor({ initial, save }: { initial: Routine; save: (r: Routine) => void }) {
  const [draft, setDraft] = useState(initial);
  const [targets, setTargets] = useState<Record<string, { sets: string; min: string; max: string; rir: string }>>({});
  const { error, run } = useAction();
  const update = (entryId: string, field: 'sets' | 'min' | 'max' | 'rir', value: string) => {
    const e = draft.entries.find(e => e.id === entryId)!;
    setTargets(v => ({ ...v, [entryId]: { ...(v[entryId] ?? { sets: String(e.targetSets), min: String(e.repMin), max: String(e.repMax), rir: e.targetRir === null ? '' : String(e.targetRir) }), [field]: value } }));
  };
  function move(index: number, direction: number) {
    const entries = [...draft.entries]; const to = index + direction;
    [entries[index], entries[to]] = [entries[to], entries[index]]; setDraft({ ...draft, entries });
  }
  return <Screen title="Edit routine">
    <Text style={styles.muted}>Save your changes when ready. Existing workouts keep their original targets.</Text>
    <Field label="Routine name" value={draft.name} maxLength={80} onChangeText={name => setDraft({ ...draft, name })} />
    <View style={styles.row}>{goals.map(goal => <Button key={goal} title={goal.replaceAll('_', ' ')} secondary={draft.goal !== goal} onPress={() => setDraft({ ...draft, goal })} />)}</View>
    {draft.entries.map((e, i) => <View key={e.id} style={styles.card}>
      <Text style={styles.heading}>{i + 1}. {exerciseName(e.exerciseId)}</Text>
      <View style={styles.row}>
        <Field label="Target sets" keyboardType="number-pad" value={targets[e.id]?.sets ?? String(e.targetSets)} onChangeText={v => update(e.id, 'sets', v)} />
        <Field label="Minimum reps" keyboardType="number-pad" value={targets[e.id]?.min ?? String(e.repMin)} onChangeText={v => update(e.id, 'min', v)} />
        <Field label="Maximum reps" keyboardType="number-pad" value={targets[e.id]?.max ?? String(e.repMax)} onChangeText={v => update(e.id, 'max', v)} />
        <Field label="Target RIR (optional)" keyboardType="decimal-pad" value={targets[e.id]?.rir ?? (e.targetRir === null ? '' : String(e.targetRir))} onChangeText={v => update(e.id, 'rir', v)} />
      </View>
      <View style={styles.row}><Button secondary title="Move up" disabled={i === 0} onPress={() => move(i, -1)} /><Button secondary title="Move down" disabled={i === draft.entries.length - 1} onPress={() => move(i, 1)} />
        <Button secondary title="Remove exercise" onPress={() => setDraft({ ...draft, entries: draft.entries.filter(v => v.id !== e.id) })} /></View>
    </View>)}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Button title="Save routine" onPress={() => run(() => {
      const entries = draft.entries.map(e => { const t = targets[e.id]; return t ? { ...e, targetSets: Number(t.sets), repMin: Number(t.min), repMax: Number(t.max), targetRir: t.rir.trim() ? Number(t.rir) : null } : e; });
      const result = routineSchema.safeParse({ ...draft, entries, revision: initial.revision + 1 });
      if (!result.success) throw new Error('Use a name, 1–10 sets, 1–100 reps (min ≤ max), and optional RIR from 0–10.');
      save(result.data); router.back();
    })} />
    <Button secondary title="Delete routine" onPress={() => confirm('Delete routine?', 'Workout history will be kept.', () => run(() => { save({ ...initial, revision: initial.revision + 1, deletedAt: new Date().toISOString() }); router.back(); }))} />
    <Text style={styles.heading}>Add an exercise</Text>
    {catalog.map(e => <View key={e.id} style={styles.card}><Text style={styles.heading}>{e.name}</Text><Text style={styles.muted}>{e.equipment} · {e.muscles.join(', ')} · {e.pattern}</Text>
      <Text style={styles.text}>{e.instructions}</Text><Button secondary title={`Add ${e.name}`} disabled={draft.entries.length >= 30} onPress={() => setDraft({ ...draft, entries: [...draft.entries, makeEntry(randomUUID, e.id)] })} />
    </View>)}
  </Screen>;
}
