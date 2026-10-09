import { useEffect, useState } from 'react';
import { localDay } from '../domain/dates';

export function useToday() {
  const [today, setToday] = useState(localDay);
  useEffect(() => {
    const refresh = () => setToday(localDay());
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return today;
}
