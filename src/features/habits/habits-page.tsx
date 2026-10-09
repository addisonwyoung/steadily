import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeading, errorMessage } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useSteadily } from '../../store/context';
import type { Habit } from '../../domain/schema';
import { HabitEditor } from './habit-editor';

export default function HabitsPage() {
  const habits = useSteadily((state) => state.data.habits);
  const priority = useSteadily((state) => state.data.profile?.priority);
  const setPriority = useSteadily((state) => state.setPriority);
  const [editor, setEditor] = useState<Habit | 'new' | null>(null);
  const notify = useFeedback();
  return (
    <>
      <PageHeading
        title="Small enough for real life."
        description="Adjust your habits as you learn what works."
        action={
          <button
            className="primary"
            onClick={() => setEditor('new')}
            disabled={habits.length >= 5}
          >
            <Plus size={16} /> Add habit
          </button>
        }
      />
      <div className="stack">
        {habits.map((habit) => (
          <section key={habit.id} className="card">
            <div className="row wrap">
              <div>
                <span className="eyebrow">
                  {habit.time}
                  {priority === habit.id ? ' · Today’s priority' : ''}
                </span>
                <h2 className="habit-title">{habit.title}</h2>
                <p>{habit.normal}</p>
                <small>Minimum: {habit.minimum}</small>
              </div>
              <div className="row wrap">
                <button
                  className="small"
                  aria-pressed={priority === habit.id}
                  onClick={() => {
                    try {
                      setPriority(habit.id);
                      notify('Your one important thing is updated.');
                    } catch (err) {
                      notify(errorMessage(err));
                    }
                  }}
                >
                  Make priority
                </button>
                <button className="small" onClick={() => setEditor(habit)}>
                  Edit habit
                </button>
              </div>
            </div>
          </section>
        ))}
        <p className="note">
          {habits.length}/5 habits. Keeping your list small leaves room to actually live it.
        </p>
      </div>
      {editor && (
        <HabitEditor
          habit={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}
