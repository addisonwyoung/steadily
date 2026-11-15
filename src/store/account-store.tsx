import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../features/auth/auth-context';
import { createSteadilyStore } from './create-store';
import { StoreProvider } from './context';
import { registerHabitTools } from '../lib/webmcp';
import type { StoragePort } from '../lib/storage';
import { fetchUserHabits, userHabitRepository } from '../features/habits/user-habits';
import { fetchHabitTemplates } from '../features/habits/habit-templates';
import { completionRepository } from '../features/habits/completions';
import type { Habit } from '../domain/schema';

// Each account gets its own browser keys. Unowned v1/v2 data stays preserved.
export function accountStorage(userId: string, storage: StoragePort): StoragePort {
  return {
    getItem: (key) => storage.getItem(`${key}:user:${userId}`),
    setItem: (key, value) => storage.setItem(`${key}:user:${userId}`, value),
  };
}
function UserStore({ userId, children }: { userId: string; children: ReactNode }) {
  const [store] = useState(() =>
    createSteadilyStore({
      habitRepository: userHabitRepository(userId),
      completions: completionRepository(userId),
      storage: accountStorage(userId, {
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
      }),
    }),
  );
  const { signOut } = useAuth();
  const [status, setStatus] = useState<'loading' | 'ready' | 'import' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [importIds, setImportIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const loadHistory = useCallback(
    async (signal?: AbortSignal) => {
      const remote = completionRepository(userId);
      const storage = accountStorage(userId, window.localStorage);
      if (!storage.getItem('steadily-completions-imported-v1')) {
        const data = store.getState().data;
        // A recovery copy remains available even after server history replaces the browser list.
        storage.setItem('steadily-before-completion-sync', JSON.stringify(data));
        const rows = Object.entries(data.logs).flatMap(([day, entries]) =>
          Object.entries(entries).flatMap(([id, entry]) => {
            const habit = data.habits.find((habit) => habit.id === id);
            return habit?.templateId && (entry.type === 'normal' || entry.type === 'minimum')
              ? [{ habit_id: habit.templateId, day, completed: true }]
              : [];
          }),
        );
        await remote.import(rows);
        if (signal?.aborted) return;
        storage.setItem('steadily-completions-imported-v1', 'true');
      }
      const rows = await remote.load(signal);
      if (!signal?.aborted) store.getState().setCompletions(rows);
    },
    [store, userId],
  );
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const habits = await fetchUserHabits(userId, controller.signal);
        if (controller.signal.aborted) return;
        const local = store.getState().data.habits;
        if (!habits.length && local.length) {
          const templates = await fetchHabitTemplates(controller.signal);
          if (controller.signal.aborted) return;
          const ids = [
            ...new Set(
              local.flatMap((habit) => {
                const match = templates.find(
                  (template) =>
                    habit.templateId === template.id ||
                    (!habit.templateId &&
                      (habit.title === template.title || habit.normal === template.task)),
                );
                return match ? [match.id] : [];
              }),
            ),
          ];
          setImportIds(ids);
          setStatus('import');
          return;
        }
        store.getState().setUserHabits(habits);
        await loadHistory(controller.signal);
        if (!controller.signal.aborted) setStatus('ready');
      } catch {
        if (!controller.signal.aborted) {
          setMessage(
            'Your habits or completion history could not be loaded. Apply the habit completions SQL migration if you have not yet, then retry. Your earlier history is preserved in browser storage.',
          );
          setStatus('error');
        }
      }
    })();
    return () => controller.abort();
  }, [store, userId, attempt, loadHistory]);
  useEffect(() => {
    if (status === 'ready') return registerHabitTools(store);
  }, [store, status]);

  useEffect(() => {
    if (status !== 'ready') return;
    const controller = new AbortController();
    let reading = false;
    const refresh = async () => {
      if (reading || document.visibilityState === 'hidden' || store.getState().completionSaving)
        return;
      reading = true;
      const previous = store.getState().data.logs;
      try {
        const rows = await completionRepository(userId).load(controller.signal);
        if (
          !controller.signal.aborted &&
          !store.getState().completionSaving &&
          store.getState().data.logs === previous
        ) {
          store.getState().setCompletions(rows);
          store.getState().setCompletionSyncError(null);
        }
      } catch {
        if (!controller.signal.aborted)
          store
            .getState()
            .setCompletionSyncError(
              'Progress could not refresh. Showing the last loaded history; it will retry automatically.',
            );
      } finally {
        reading = false;
      }
    };
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    const interval = window.setInterval(onFocus, 15000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [store, userId, status]);
  async function finish(habits: Habit[]) {
    store.getState().setUserHabits(habits);
    await loadHistory();
    setStatus('ready');
  }
  if (status !== 'ready')
    return (
      <main className="onboard">
        {status === 'loading' ? (
          <p role="status">Loading your saved habits…</p>
        ) : status === 'import' ? (
          <section className="card">
            <h1>Bring your habits online</h1>
            <p>This browser has earlier selections, but your account has none saved online.</p>
            <p>{importIds.length} of your habits match the shared list.</p>
            {message && <p role="alert">{message}</p>}
            <button
              className="primary"
              disabled={importing || importIds.length < 2 || importIds.length > 5}
              onClick={async () => {
                setImporting(true);
                setMessage('');
                try {
                  await finish(await userHabitRepository(userId).initialize(importIds));
                } catch {
                  setMessage('Your habits could not be imported. Please try again.');
                } finally {
                  setImporting(false);
                }
              }}
            >
              {importing ? 'Saving your habits…' : 'Import my selections'}
            </button>
            <button
              disabled={importing}
              onClick={async () => {
                try {
                  // Keep a recovery copy before replacing old browser-only selections.
                  accountStorage(userId, window.localStorage).setItem(
                    'steadily-before-online',
                    JSON.stringify(store.getState().data),
                  );
                  await finish([]);
                } catch {
                  setMessage(
                    'Could not preserve your old selections. Please allow browser storage and retry.',
                  );
                }
              }}
            >
              Choose habits again
            </button>
          </section>
        ) : (
          <section className="card">
            <h1>Your habits could not be opened</h1>
            <p role="alert">{message}</p>
            <button
              onClick={() => {
                setStatus('loading');
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </button>
          </section>
        )}
        <button
          disabled={importing}
          onClick={() => {
            void signOut().catch(() => setMessage('Could not sign out. Please try again.'));
          }}
        >
          Sign out
        </button>
      </main>
    );
  return <StoreProvider store={store}>{children}</StoreProvider>;
}
export function AccountStore({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? (
    <UserStore key={user.id} userId={user.id}>
      {children}
    </UserStore>
  ) : (
    children
  );
}
