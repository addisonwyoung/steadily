import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/modal';
import { ErrorMessage, errorMessage } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useSteadily } from '../../store/context';
import { habitInputSchema, type Habit, type HabitInput } from '../../domain/schema';
import { HabitFields } from './habit-fields';

export function HabitEditor({ habit, onClose }: { habit?: Habit; onClose(): void }) {
  const saveHabit = useSteadily((state) => state.saveHabit);
  const notify = useFeedback();
  const [value, setValue] = useState<HabitInput>(
    habit ?? { title: '', normal: '', minimum: '', time: 'Anytime', icon: '✧' },
  );
  const [error, setError] = useState<string | null>(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = habitInputSchema.safeParse(value);
    if (!parsed.success) {
      setError('Give your habit a name, a normal version, and a smaller version.');
      return;
    }
    try {
      saveHabit(parsed.data, habit?.id);
      notify('Your plan can grow with you.');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  return (
    <Modal
      title={habit ? 'Adjust your habit' : 'One more small step'}
      description="Choose something that fits your life, including the difficult days."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <HabitFields value={value} onChange={setValue} />
        <ErrorMessage error={error} />
        <button className="primary full">Save habit</button>
      </form>
    </Modal>
  );
}
