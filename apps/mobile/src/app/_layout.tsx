import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { View, Text } from 'react-native';
import { StoreProvider } from '../store';
import { CloudProvider } from '../cloud/provider';
import { Button, styles } from '../ui';
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <View style={[styles.screen, { padding: 24, justifyContent: 'center', gap: 16 }]}>
    <Text style={styles.heading}>Could not open your workout data</Text>
    <Text style={styles.text}>Your database has been kept. Try reopening the app. Do not uninstall it if you need to recover local workouts.</Text>
    <Button title="Retry" onPress={retry} />
  </View>;
}
export default function Layout() {
  return <StoreProvider><CloudProvider><Stack screenOptions={{ headerTintColor: '#173528', headerTitle: 'Gym Companion', headerBackTitle: 'Back' }} /></CloudProvider></StoreProvider>;
}
