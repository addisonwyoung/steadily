import { useState } from 'react';
import { Modal } from '../../components/modal';
import { ErrorMessage, errorMessage } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useSteadily } from '../../store/context';
import { reasons, type Habit, type Reason } from '../../domain/schema';
import { suggestions } from '../../domain/content';

export function RecoveryDialog({ habit, onClose }: { habit: Habit; onClose(): void }) {
  const recordMiss = useSteadily((state) => state.recordMiss);
  const completeHabit = useSteadily((state) => state.completeOnline);
  const saving = useSteadily((state) => state.completionSaving);
  const notify = useFeedback();
  const [reason, setReason] = useState<Reason | null>(null);
  const [error, setError] = useState<string | null>(null);
  function choose(value: Reason) {
    try {
      recordMiss(habit.id, value);
      setReason(value);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  return (
    <Modal
      title="Let’s make this a little easier."
      description={`${habit.title} can wait. What got in the way?`}
      onClose={onClose}
    >
      <div className="choices">
        {reasons.map((value) => (
          <button
            key={value}
            aria-pressed={reason === value}
            className={reason === value ? 'active' : ''}
            onClick={() => choose(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <ErrorMessage error={error} />
      {reason && (
        <>
          <div className="callout">{suggestions[reason]}</div>
          <button
            className="primary full"
            disabled={saving}
            onClick={async () => {
              try {
                await completeHabit(habit.id);
                notify('Habit completed.');
                onClose();
              } catch (err) {
                setError(errorMessage(err));
              }
            }}
          >
            I completed this habit
          </button>
          <button
            className="textbutton full"
            onClick={() => {
              notify('Your progress is still here. Begin again when you can.');
              onClose();
            }}
          >
            Leave it for today
          </button>
        </>
      )}
    </Modal>
  );
}
