import { useState } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../store';
import { useCloud } from '../cloud/provider';
import { cloudClient, cloudWritesAllowed, configurationError, testConnection } from '../cloud/client';
import { Button, Field, Screen, styles, confirm } from '../ui';
export default function Settings() {
  const { repo, refresh } = useStore(); const cloud = useCloud();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const unit = repo.setting('unit') === 'lb' ? 'lb' : 'kg';
  const enabled = repo.setting('upload_enabled') === '1';
  async function action(fn: () => Promise<string>) {
    setBusy(true); try { setMessage(await fn()); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Cloud request failed.'); }
    finally { setBusy(false); }
  }
  return <Screen title="Settings & cloud">
    <View style={styles.card}><Text style={styles.heading}>New workout units</Text>
      <Text style={styles.muted}>Existing sessions keep their original units. Previous values only fill from the same unit and targets.</Text>
      <View style={styles.row}>{(['kg', 'lb'] as const).map(value => <Button key={value} title={value} secondary={unit !== value} onPress={() => {
        try { repo.setSetting('unit', value); refresh(); } catch { setMessage('Could not save units.'); }
      }} />)}</View>
    </View>
    <View style={styles.card}><Text style={styles.heading}>Optional Supabase upload</Text>
      <Text style={styles.text}>Local workouts work without an account. Upload sends routines, set values and notes to your Supabase account. This increment uploads from one device; it does not restore or merge cloud data.</Text>
      <Text style={styles.muted}>This installation is a single-person local notebook. Signing out leaves local data here. Use device access controls; do not share it between people.</Text>
      {configurationError ? <Text style={styles.error}>{configurationError}</Text> : null}
      <Button secondary title="Test connection (read only)" disabled={busy || !cloudClient} onPress={() => { void action(testConnection); }} />
      {!cloudWritesAllowed ? <Text style={styles.muted}>Hosted writes are disabled. Approve/apply the migrations before enabling EXPO_PUBLIC_ENABLE_CLOUD_WRITES and restarting Metro.</Text> : null}
      {cloudWritesAllowed && cloudClient ? cloud.session ? <>
        <Text style={styles.text}>Signed in as {cloud.session.user.email}</Text>
        <Text style={styles.text}>{enabled ? cloud.message : 'Upload is off.'}</Text>
        <Text style={styles.muted}>{repo.pending(cloud.session.user.id).length} queued records for this account.</Text>
        <Button title={enabled ? 'Stop uploading' : 'Enable live upload'} onPress={() => {
          if (enabled) { repo.disableUpload(); cloud.changed(); refresh(); return; }
          confirm('Upload this device’s data?', 'This sends all saved routines, workouts and notes to your signed-in account, then uploads edits while enabled. The device remains linked to this account to prevent accidental upload to someone else.', () => {
            try { repo.enableUpload(cloud.session!.user.id); cloud.changed(); refresh(); setMessage('Upload enabled.'); }
            catch (e) { setMessage(e instanceof Error ? e.message : 'Could not enable upload.'); }
          });
        }} />
        <Button secondary title="Retry upload now" disabled={cloud.busy || !enabled} onPress={() => { void cloud.retry(); }} />
        <Button secondary title="Sign out" disabled={busy} onPress={() => { void action(async () => {
          repo.disableUpload(); refresh(); cloud.changed();
          const { error } = await cloudClient!.auth.signOut({ scope: 'local' });
          if (error) throw new Error('Sign out failed. Upload has been stopped.');
          return 'Signed out. Your local data is still on this device.';
        }); }} />
      </> : <>
        <Field label="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Field label="Password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} />
        <Button title="Sign in" disabled={busy} onPress={() => { void action(async () => {
          const { error } = await cloudClient!.auth.signInWithPassword({ email: email.trim(), password });
          if (error) throw new Error('Could not sign in. Check your credentials and connection.');
          setPassword(''); return 'Signed in. Upload stays off until you enable it.';
        }); }} />
        <Button secondary title="Create account" disabled={busy} onPress={() => { void action(async () => {
          if (password.length < 8) throw new Error('Use a password of at least 8 characters.');
          const { error } = await cloudClient!.auth.signUp({ email: email.trim(), password });
          if (error) throw new Error('Account request failed. Check your connection and Auth configuration.');
          setPassword(''); return 'Account requested. If email confirmation is enabled, confirm your email, then sign in here.';
        }); }} />
      </> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text> : null}
      <Text style={styles.muted}>Deletion is saved as a tombstone and uploaded while enabled. Stopping upload or signing out may leave a request already in flight. Hosted permanent deletion/export controls come with the next sync increment. Device data and Auth sessions use SQLite and are not application-encrypted.</Text>
    </View>
  </Screen>;
}
