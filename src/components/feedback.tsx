import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const FeedbackContext = createContext<(message: string) => void>(() => undefined);
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((text: string) => {
    setMessage(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 4500);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <FeedbackContext.Provider value={notify}>
      {children}
      <div className={`toast ${message ? 'visible' : ''}`} role="status" aria-live="polite">
        {message}
      </div>
    </FeedbackContext.Provider>
  );
}
export const useFeedback = () => useContext(FeedbackContext);
