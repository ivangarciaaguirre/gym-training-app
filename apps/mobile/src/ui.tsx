import { useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6f3' }, content: { padding: 20, gap: 16, paddingBottom: 80 },
  title: { fontSize: 28, fontWeight: '700', color: '#173528' }, heading: { fontSize: 20, fontWeight: '600', color: '#173528' },
  text: { fontSize: 16, lineHeight: 23, color: '#33463c' }, muted: { fontSize: 14, lineHeight: 21, color: '#526358' },
  card: { padding: 16, gap: 12, borderRadius: 16, backgroundColor: 'white', borderColor: '#d8dfd8', borderWidth: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  button: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#245942', justifyContent: 'center' },
  secondary: { backgroundColor: '#e8eee7' }, buttonText: { fontSize: 16, fontWeight: '600', color: 'white', textAlign: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#99aa9d', borderRadius: 10, padding: 12, fontSize: 18, color: '#172a1e', backgroundColor: 'white' },
  error: { fontSize: 16, color: '#9b2323' },
});
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><Text accessibilityRole="header" style={styles.title}>{title}</Text>{children}</ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondary, disabled && { opacity: 0.45 }]}><Text style={[styles.buttonText, secondary && { color: '#173528' }]}>{title}</Text></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 5, flexGrow: 1 }}><Text style={styles.muted}>{label}</Text><TextInput accessibilityLabel={label} style={styles.input} {...props} /></View>;
}
export function Toggle({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <Button title={`${value ? '✓' : '○'} ${label}`} secondary={!value} disabled={disabled} onPress={() => onChange(!value)} />;
}
export function useAction() {
  const [error, setError] = useState('');
  return { error, run: (fn: () => void) => { try { fn(); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Try again.'); } } };
}
export function confirm(title: string, message: string, action: () => void) {
  Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: action }]);
}
