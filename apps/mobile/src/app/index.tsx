import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useStore } from '../store';
import { startWorkout, type Routine } from '../data/model';
import { Button, Screen, styles, useAction } from '../ui';
export default function Home() {
  const { repo, save } = useStore();
  const { error, run } = useAction();
  const routines = repo.routines();
  const active = repo.workouts().find(w => w.status !== 'finished');
  function start(r: Routine) {
    run(() => {
      if (active) { router.push(`/workout/${active.id}`); return; }
      const workout = startWorkout(r, repo.setting('unit') === 'lb' ? 'lb' : 'kg', randomUUID);
      save('workout', workout); router.push(`/workout/${workout.id}`);
    });
  }
  return <Screen title="Ready to lift?">
    <Text style={styles.text}>Choose your routine. Every workout saves on this device, including while offline.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {active ? <View style={styles.card}><Text style={styles.heading}>{active.name} · {active.status}</Text><Button title="Resume workout" onPress={() => router.push(`/workout/${active.id}`)} /></View> : null}
    <View style={styles.row}><Button secondary title="History" onPress={() => router.push('/history')} /><Button secondary title="Settings & cloud" onPress={() => router.push('/settings')} /></View>
    {routines.length === 0 ? <Text style={styles.text}>Create a routine to get started.</Text> : null}
    {routines.map(r => <View key={r.id} style={styles.card}><Text style={styles.heading}>{r.name}</Text>
      <Text style={styles.muted}>{r.entries.length} exercises · {r.goal.replaceAll('_', ' ')}</Text>
      <View style={styles.row}><Button title="Start workout" disabled={r.entries.length === 0 || !!active} onPress={() => start(r)} />
        <Button secondary title={`Edit ${r.name}`} onPress={() => router.push(`/routine/${r.id}`)} /></View>
    </View>)}
    <Button secondary title="Create routine" onPress={() => run(() => {
      const r: Routine = { id: randomUUID(), name: 'New routine', goal: 'balanced', entries: [], revision: 1, deletedAt: null };
      save('routine', r); router.push(`/routine/${r.id}`);
    })} />
  </Screen>;
}
