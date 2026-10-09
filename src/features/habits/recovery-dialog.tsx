import { useState } from 'react';
import { Modal } from '../../components/modal';
import { ErrorMessage, errorMessage } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useSteadily } from '../../store/context';
import { reasons, type Habit, type Reason } from '../../domain/schema';
import { suggestions } from '../../domain/content';

export function RecoveryDialog({
  habit,
  onClose,
  onEdit,
}: {
  habit: Habit;
  onClose(): void;
  onEdit(): void;
}) {
  const recordMiss = useSteadily((state) => state.recordMiss);
  const completeHabit = useSteadily((state) => state.completeHabit);
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
      description={`${habit.title} can wait, shrink, or move. What got in the way?`}
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
          <p className="note">Minimum: {habit.minimum}</p>
          <button
            className="primary full"
            onClick={() => {
              try {
                completeHabit(habit.id, 'minimum');
                notify('Small counts. You showed up.');
                onClose();
              } catch (err) {
                setError(errorMessage(err));
              }
            }}
          >
            I did the minimum version
          </button>
          <button className="full" onClick={onEdit}>
            Adjust this habit
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
