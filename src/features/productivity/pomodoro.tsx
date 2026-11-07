import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Mode = 'focus' | 'break';
function useTimer() {
  const [lengths, setLengths] = useState({ focus: 25, break: 5 });
  const [mode, setMode] = useState<Mode>('focus');
  const [remaining, setRemaining] = useState(25 * 60);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [message, setMessage] = useState('Ready when you are.');
  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) {
        const next = mode === 'focus' ? 'break' : 'focus';
        setDeadline(null);
        setMode(next);
        setRemaining(lengths[next] * 60);
        setMessage(
          next === 'break'
            ? 'Focus complete. Time for a break!'
            : 'Break complete. Ready to focus?',
        );
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [deadline, mode, lengths]);
  function reset(next: Mode = mode) {
    setDeadline(null);
    setMode(next);
    setRemaining(lengths[next] * 60);
    setMessage('Ready when you are.');
  }
  return {
    lengths,
    mode,
    remaining,
    running: deadline !== null,
    message,
    reset,
    toggle() {
      if (deadline !== null) {
        setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
        setDeadline(null);
      } else setDeadline(Date.now() + remaining * 1000);
    },
    customize(focus: number, rest: number) {
      setLengths({ focus, break: rest });
      setDeadline(null);
      setRemaining((mode === 'focus' ? focus : rest) * 60);
      setMessage('Durations updated. Ready when you are.');
    },
  };
}
const TimerContext = createContext<ReturnType<typeof useTimer> | null>(null);
export function PomodoroProvider({ children }: { children: ReactNode }) {
  const timer = useTimer();
  return <TimerContext.Provider value={timer}>{children}</TimerContext.Provider>;
}
export function usePomodoro() {
  const timer = useContext(TimerContext);
  if (!timer) throw new Error('PomodoroProvider is required');
  return timer;
}
