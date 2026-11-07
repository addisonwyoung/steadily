import { useEffect, useState } from 'react';
import { fetchHabitTemplates, type HabitTemplate } from './habit-templates';
import { PageHeading, errorMessage } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { useSteadily } from '../../store/context';
export default function HabitsPage() {
  const habits = useSteadily((state) => state.data.habits);
  const priority = useSteadily((state) => state.data.profile?.priority);
  const saveHabit = useSteadily((state) => state.addSelectedHabit);
  const removeHabit = useSteadily((state) => state.removeSelectedHabit);
  const saving = useSteadily((state) => state.habitsSaving);
  const writable = useSteadily((state) => state.writable);
  const [retry, setRetry] = useState(0);
  const setPriority = useSteadily((state) => state.setPriority);
  const notify = useFeedback();

  const [templates, setTemplates] = useState<HabitTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadTemplates() {
      try {
        const data = await fetchHabitTemplates(controller.signal);

        if (active) {
          setTemplates(data ?? []);
        }
      } catch {
        if (active) {
          setTemplatesError('Could not load habit suggestions. Please reload to try again.');
        }
      } finally {
        if (active) {
          setTemplatesLoading(false);
        }
      }
    }

    void loadTemplates();

    return () => {
      active = false;
      controller.abort();
    };
  }, [retry]);
  return (
    <>
      <PageHeading
        title="Small enough for real life."
        description="Adjust your habits as you learn what works."
      />
      <section className="card habit-picker" aria-labelledby="habit-picker-title">
        <div className="row wrap">
          <div>
            <h2 id="habit-picker-title">Find your next habit</h2>
            <p>
              Choose two to five habits. Add another before removing one when you have only two.
            </p>
          </div>
          <strong aria-live="polite">{habits.length}/5 selected</strong>
        </div>
        {habits.length < 2 && (
          <p role="status">
            Choose {2 - habits.length} more habit{habits.length === 0 ? 's' : ''} to continue.
          </p>
        )}
        {habits.length >= 5 && (
          <p className="note">
            Your five slots are filled. Click a selected habit to make room for another.
          </p>
        )}
        {templatesLoading ? (
          <p role="status">Loading habit suggestions…</p>
        ) : templatesError ? (
          <div>
            <p role="alert">{templatesError}</p>
            <button
              onClick={() => {
                setTemplatesLoading(true);
                setTemplatesError(null);
                setRetry((value) => value + 1);
              }}
            >
              Try again
            </button>
          </div>
        ) : templates.length === 0 ? (
          <p>No habit suggestions are available yet.</p>
        ) : (
          <div className="habit-template-grid">
            {templates.map((template) => {
              const selectedHabit = habits.find(
                (habit) =>
                  habit.templateId === template.id ||
                  (!habit.templateId &&
                    (habit.normal === template.task ||
                      habit.title.toLowerCase() === template.title.toLowerCase())),
              );
              const selected = Boolean(selectedHabit);
              return (
                <button
                  key={template.id}
                  type="button"
                  className={`habit-template ${selected ? 'is-selected' : ''}`}
                  aria-pressed={selected}
                  disabled={
                    (selected ? habits.length <= 2 : habits.length >= 5) || !writable || saving
                  }
                  onClick={async () => {
                    try {
                      if (selectedHabit) {
                        await removeHabit(selectedHabit.id);
                        notify(`${template.title} removed from your habits.`);
                        return;
                      }

                      await saveHabit({
                        templateId: template.id,
                        title: template.title,
                        normal: template.task,
                        time: template.suggested_time,
                        icon: '✧',
                      });
                      notify(`${template.title} added to your habits.`);
                    } catch (error) {
                      notify(errorMessage(error));
                    }
                  }}
                >
                  <span className="habit-template-heading">
                    <strong>{template.title}</strong>
                    <span aria-hidden="true">{selected ? '✓' : '+'}</span>
                  </span>
                  <span className="habit-template-task">{template.task}</span>
                  <small>{selected ? 'Selected · Click to remove' : template.suggested_time}</small>
                </button>
              );
            })}
          </div>
        )}
      </section>
      {saving && <p role="status">Saving your habits…</p>}
      <h2>Your habits</h2>
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
                <button
                  className="small"
                  disabled={habits.length <= 2 || !writable || saving}
                  onClick={async () => {
                    try {
                      await removeHabit(habit.id);
                      notify(`${habit.title} removed from your habits.`);
                    } catch (error) {
                      notify(errorMessage(error));
                    }
                  }}
                >
                  Remove habit
                </button>
              </div>
            </div>
          </section>
        ))}
        <p className="note">{habits.length}/5 habits. Choose at least two and no more than five.</p>
      </div>
    </>
  );
}
