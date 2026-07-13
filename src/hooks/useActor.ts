import { useCallback, useSyncExternalStore } from 'react';
import { ACTOR_STORAGE_KEY, getActorId, setActorId } from '../api/crmClient';

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACTOR_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * The acting rep's id (crm_users UUID), persisted in localStorage and sent
 * on every API call as X-Actor-Id. Null until the RepPicker gate is passed.
 */
export function useActor(): {
  actorId: string | null;
  selectActor: (id: string) => void;
  clearActor: () => void;
} {
  const actorId = useSyncExternalStore(subscribe, getActorId);

  const selectActor = useCallback((id: string) => {
    setActorId(id);
    notify();
  }, []);

  const clearActor = useCallback(() => {
    setActorId(null);
    notify();
  }, []);

  return { actorId, selectActor, clearActor };
}
