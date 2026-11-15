import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Habit } from '../../domain/schema';
import { isComplete } from '../../domain/selectors';
import { useSteadily } from '../../store/context';
import { useFeedback } from '../../components/feedback';
import { errorMessage } from '../../components/ui';
import { RecoveryDialog } from './recovery-dialog';

export function HabitCard({ habit, today }: { habit: Habit; today: string }) {
  const entry = useSteadily((state) => state.data.logs[today]?.[habit.id]);
  const completeHabit = useSteadily((state) => state.completeOnline);
  const undoHabit = useSteadily((state) => state.undoOnline);
  const [dialog, setDialog] = useState<'recovery' | null>(null);
  const saving = useSteadily((state) => state.completionSaving);
  const notify = useFeedback();
  async function perform(action: () => Promise<void>, message: string) {
    try {
      await action();
      notify(message);
    } catch (err) {
      notify(errorMessage(err));
    }
  }
  return (
    <article className="habit" aria-label={habit.title}>
      <div className="habithead">
        <span className="habiticon" aria-hidden="true">
          {isComplete(entry) ? <Check size={20} /> : habit.icon}
        </span>
        <div className="habit-info">
          <div className="row">
            <h3>{habit.title}</h3>
            <small>{habit.time}</small>
          </div>
          <p>{habit.normal}</p>
          {isComplete(entry) ? (
            <div className="status">
              Completed ·{' '}
              <button
                className="textbutton"
                disabled={saving}
                onClick={() => perform(() => undoHabit(habit.id), 'Completion undone.')}
              >
                Undo
              </button>
            </div>
          ) : entry?.type === 'missed' ? (
            <div className="status">A day to adjust · {entry.reason}</div>
          ) : null}
        </div>
      </div>
      <div className="actions">
        <button
          disabled={saving}
          aria-pressed={isComplete(entry)}
          className={isComplete(entry) ? 'active' : ''}
          onClick={() => perform(() => completeHabit(habit.id), 'Habit completed.')}
        >
          Complete
        </button>
        <button className="textbutton" onClick={() => setDialog('recovery')}>
          Having a hard day?
        </button>
      </div>
      {dialog === 'recovery' && <RecoveryDialog habit={habit} onClose={() => setDialog(null)} />}
    </article>
  );
}
