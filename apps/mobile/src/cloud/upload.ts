import { type Repository } from '../data/repository';
export type UploadClient = { save(kind: 'routine' | 'workout', data: unknown, deviceId: string): Promise<void> };
export async function drainUploads(repo: Repository, owner: string, client: UploadClient, active: () => boolean) {
  const deviceId = repo.setting('device_id');
  if (!deviceId) throw new Error('Missing device ID. Upload stopped.');
  for (const item of repo.pending(owner)) {
    if (!active() || repo.setting('upload_enabled') !== '1' || repo.setting('upload_owner') !== owner) return;
    await client.save(item.kind, JSON.parse(item.data), deviceId);
    repo.acknowledge(item);
  }
}
