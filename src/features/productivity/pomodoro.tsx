import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/auth-context';
import { useSteadily } from '../../store/context';
import type { Habit } from '../../domain/schema';
import { useToday } from '../../lib/use-today';
import { finishTimer, newTimer, resetTimer, timerSchema, type FocusTimer } from './focus-timer';
import {
  loadFocusSessions,
  saveFocusSession,
  type FocusSession,
  type SavedFocusSession,
} from './focus-sessions';

export interface FocusRepository {
  load(userId: string, today: string, signal: AbortSignal): Promise<SavedFocusSession[]>;
  save(userId: string, session: FocusSession, signal: AbortSignal): Promise<SavedFocusSession>;
}
const repository: FocusRepository = { load: loadFocusSessions, save: saveFocusSession };
export const timerStorageKey = (userId: string) => `steadily-focus-v1:user:${userId}`;
function recover(key: string) {
  try {
    const raw = localStorage.getItem(key);
    return { timer: raw ? timerSchema.parse(JSON.parse(raw)) : newTimer(), blocked: false };
  } catch {
    return { timer: newTimer(), blocked: true };
  }
}
function useTimer(userId: string, habits: Habit[], remote: FocusRepository) {
  const key = timerStorageKey(userId);
  const [initial] = useState(() => recover(key));
  const [timer, setTimer] = useState(initial.timer);
  const current = useRef(initial.timer);
  const [blocked, setBlocked] = useState(initial.blocked);
  const [storageError, setStorageError] = useState('');
  const [now, setNow] = useState(Date.now);
  const [message, setMessage] = useState('Ready when you are.');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [retrySave, setRetrySave] = useState(0);
  const [sessions, setSessions] = useState<SavedFocusSession[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [retryHistory, setRetryHistory] = useState(0);
  const today = useToday();
  const update = useCallback(
    (change: (value: FocusTimer) => FocusTimer) => {
      const next = change(current.current);
      if (next === current.current) return;
      try {
        localStorage.setItem(key, JSON.stringify(timerSchema.parse(next)));
        setStorageError('');
      } catch {
        setStorageError(
          'Timer recovery could not be saved in this browser. Keep this page open until pending sessions are saved.',
        );
      }
      current.current = next;
      setTimer(next);
    },
    [key],
  );

  useEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      const time = Date.now();
      setNow(time);
      if (!blocked)
        update((value) => {
          const next = finishTimer(value, time);
          if (next !== value)
            setMessage(
              value.mode === 'focus'
                ? 'Focus complete. Time for a break!'
                : 'Break complete. Ready to focus?',
            );
          return next;
        });
    };
    queueMicrotask(tick);
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [blocked, update]);

  useEffect(() => {
    const controller = new AbortController();
    void remote
      .load(userId, today, controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setSessions((existing) => [
          ...new Map([...loaded, ...existing].map((session) => [session.id, session])).values(),
        ]);
        setHistoryError('');
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setHistoryError(
            'Session history could not be loaded. If this is your first setup, apply the focus sessions SQL migration, then retry.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });
    return () => controller.abort();
  }, [userId, remote, today, retryHistory]);

  const firstPending = timer.pending[0];
  useEffect(() => {
    if (!firstPending || blocked) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setSaving(true);
      setSaveError('');
      void remote
        .save(userId, firstPending, controller.signal)
        .then((saved) => {
          if (controller.signal.aborted) return;
          setSaving(false);
          setSessions((existing) => [
            ...existing.filter((session) => session.id !== saved.id),
            saved,
          ]);
          update((value) => ({
            ...value,
            pending: value.pending.filter((session) => session.id !== saved.id),
          }));
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setSaveError(
              'This completed session has not been confirmed online. It is queued in this browser; retry when connected.',
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setSaving(false);
        });
    });
    return () => controller.abort();
  }, [firstPending, userId, remote, blocked, update, retrySave]);

  const remaining =
    timer.deadline === null
      ? timer.remaining
      : Math.max(0, Math.ceil((timer.deadline - now) / 1000));
  return {
    ...timer,
    remaining,
    running: timer.deadline !== null,
    message,
    habits,
    sessions,
    today,
    saving,
    saveError,
    historyError,
    historyLoading,
    storageError,
    blocked,
    lockedHabit: timer.active !== null,
    retrySaving() {
      setRetrySave((value) => value + 1);
    },
    reloadHistory() {
      setHistoryLoading(true);
      setRetryHistory((value) => value + 1);
    },
    selectHabit(id: string) {
      if (timer.active || (id && !habits.some((habit) => habit.templateId === id))) return;
      update((value) => ({ ...value, selectedHabitId: id }));
    },
    reset(mode = timer.mode) {
      if (blocked) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) localStorage.setItem(`${key}:unreadable-backup`, raw);
        } catch {
          setStorageError(
            'Could not preserve the unreadable timer. Allow browser storage before resetting.',
          );
          return;
        }
        setBlocked(false);
      }
      update((value) => resetTimer(finishTimer(value, Date.now()), mode));
      setMessage('Ready when you are.');
    },
    toggle() {
      if (blocked) return;
      const time = Date.now();
      setNow(time);
      const value = current.current;
      if (value.deadline !== null) {
        if (value.deadline <= time) {
          update((timer) => finishTimer(timer, time));
          return;
        }
        update((timer) => ({
          ...timer,
          remaining: Math.ceil((timer.deadline! - time) / 1000),
          deadline: null,
        }));
      } else {
        if (
          value.mode === 'focus' &&
          !value.active &&
          !habits.some((habit) => habit.templateId === value.selectedHabitId)
        ) {
          setMessage('Choose one of your habits before starting a focus session.');
          return;
        }
        update((timer) => ({
          ...timer,
          deadline: time + timer.remaining * 1000,
          active:
            timer.mode === 'focus'
              ? (timer.active ?? {
                  id: crypto.randomUUID(),
                  habitId: timer.selectedHabitId,
                  startedAt: new Date(time).toISOString(),
                  durationSeconds: timer.lengths.focus * 60,
                })
              : null,
        }));
      }
    },
    customize(focus: number, rest: number) {
      if (
        blocked ||
        !Number.isInteger(focus) ||
        !Number.isInteger(rest) ||
        focus < 1 ||
        focus > 180 ||
        rest < 1 ||
        rest > 180
      ) {
        setMessage('Choose whole durations between 1 and 180 minutes.');
        return;
      }
      update((timer) =>
        resetTimer({ ...finishTimer(timer, Date.now()), lengths: { focus, break: rest } }),
      );
      setMessage('Durations updated. Ready when you are.');
    },
  };
}
const TimerContext = createContext<ReturnType<typeof useTimer> | null>(null);
export function FocusTimerProvider({
  userId,
  habits,
  children,
  remote = repository,
}: {
  userId: string;
  habits: Habit[];
  children: ReactNode;
  remote?: FocusRepository;
}) {
  const timer = useTimer(userId, habits, remote);
  return <TimerContext.Provider value={timer}>{children}</TimerContext.Provider>;
}
export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const habits = useSteadily((state) => state.data.habits);
  if (!user) return null;
  return (
    <FocusTimerProvider key={user.id} userId={user.id} habits={habits}>
      {children}
    </FocusTimerProvider>
  );
}
export function usePomodoro() {
  const timer = useContext(TimerContext);
  if (!timer) throw new Error('PomodoroProvider is required');
  return timer;
}
