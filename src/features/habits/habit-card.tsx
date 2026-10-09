import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Habit } from '../../domain/schema';
import { isComplete } from '../../domain/selectors';
import { useSteadily } from '../../store/context';
import { useFeedback } from '../../components/feedback';
import { errorMessage } from '../../components/ui';
import { RecoveryDialog } from './recovery-dialog';
import { HabitEditor } from './habit-editor';

export function HabitCard({ habit, today }: { habit: Habit; today: string }) {
  const entry = useSteadily((state) => state.data.logs[today]?.[habit.id]);
  const completeHabit = useSteadily((state) => state.completeHabit);
  const undoHabit = useSteadily((state) => state.undoHabit);
  const [dialog, setDialog] = useState<'recovery' | 'edit' | null>(null);
  const notify = useFeedback();
  function perform(action: () => void, message: string) {
    try {
      action();
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
              {entry?.type === 'minimum' ? 'Minimum version' : 'Normal version'} completed ·{' '}
              <button
                className="textbutton"
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
          aria-pressed={entry?.type === 'normal'}
          className={entry?.type === 'normal' ? 'active' : ''}
          onClick={() => perform(() => completeHabit(habit.id, 'normal'), 'One small step, taken.')}
        >
          Normal
        </button>
        <button
          aria-pressed={entry?.type === 'minimum'}
          className={entry?.type === 'minimum' ? 'active' : ''}
          title={habit.minimum}
          onClick={() =>
            perform(() => completeHabit(habit.id, 'minimum'), 'Small counts. You showed up.')
          }
        >
          Minimum
        </button>
        <button className="textbutton" onClick={() => setDialog('recovery')}>
          Having a hard day?
        </button>
      </div>
      {dialog === 'recovery' && (
        <RecoveryDialog
          habit={habit}
          onClose={() => setDialog(null)}
          onEdit={() => setDialog('edit')}
        />
      )}
      {dialog === 'edit' && <HabitEditor habit={habit} onClose={() => setDialog(null)} />}
    </article>
  );
}
