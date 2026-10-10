import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useStore } from '../store';
import { Button, Screen, styles, confirm, useAction } from '../ui';
export default function History() {
  const { repo, save } = useStore(); const { run, error } = useAction();
  const history = repo.workouts().filter(w => w.status === 'finished').sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''));
  return <Screen title="Workout history">
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {history.length === 0 ? <Text style={styles.text}>Finished workouts will appear here. Start with a routine on the home screen.</Text> : null}
    {history.map(w => <View key={w.id} style={styles.card}><Text style={styles.heading}>{w.name}</Text>
      <Text style={styles.muted}>{new Date(w.startedAt).toLocaleString()} · {w.unit} · {w.exercises.flatMap(e => e.sets).filter(s => s.completedAt).length} logged sets</Text>
      <Button title="View sets & guidance" onPress={() => router.push(`/workout/${w.id}`)} />
      <Button secondary title="Delete workout" onPress={() => confirm('Delete workout?', 'This session will be removed from history and queued as deleted if upload is enabled.', () => run(() => save('workout', { ...w, deletedAt: new Date().toISOString(), revision: w.revision + 1 })))} />
    </View>)}
  </Screen>;
}
