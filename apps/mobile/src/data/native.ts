import { openDatabaseSync } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { Repository } from './repository';
import { starterRoutines } from './model';
let repository: Repository | undefined;
export function getRepository() {
  if (!repository) {
    const next = new Repository(openDatabaseSync('gym-training.db'));
    next.migrate(); next.initialize(starterRoutines(randomUUID), randomUUID());
    repository = next;
  }
  return repository;
}
