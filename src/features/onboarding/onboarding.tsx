import { useEffect, useState, type FormEvent } from 'react';
import { fetchHabitTemplates } from '../habits/habit-templates';
import { reasons, habitInputSchema, type HabitInput, type Reason } from '../../domain/schema';
import { useSteadily } from '../../store/context';
import { Brand, ErrorMessage, errorMessage } from '../../components/ui';

export function Onboarding() {
  const onboard = useSteadily((state) => state.finishOnboarding);
  const saving = useSteadily((state) => state.habitsSaving);
  const writable = useSteadily((state) => state.writable);
  const storageError = useSteadily((state) => state.storageError);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [barrier, setBarrier] = useState<Reason>('Distraction');
  const [drafts, setDrafts] = useState<Record<string, HabitInput>>({});
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<Record<string, HabitInput>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void fetchHabitTemplates(controller.signal)
      .then((templates) => {
        if (!active) return;
        setPresets(
          Object.fromEntries(
            templates.map((template) => [
              template.id,
              {
                templateId: template.id,
                title: template.title,
                normal: template.task,
                time: template.suggested_time,
                icon: '✧',
              },
            ]),
          ),
        );
        setSelected(templates.slice(0, 2).map((template) => template.id));
      })
      .catch(() => {
        if (active) setError('Could not load habit suggestions. Reload to try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  function next() {
    if (selected.length < 2) {
      setError('Choose at least two habits.');
      return;
    }
    setDrafts((previous) =>
      Object.fromEntries(selected.map((goal) => [goal, previous[goal] ?? presets[goal]!])),
    );
    setStep(2);
    setError(null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const habits = selected.map((goal) => habitInputSchema.parse(drafts[goal]));
      await onboard({ name, barrier }, habits);
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  return (
    <main className="onboard">
      <Brand />
      <span className="eyebrow">A little at a time · Step {step} of 2</span>
      <h1>{step === 1 ? 'Make room for a small beginning.' : 'Make it easy to show up.'}</h1>
      <p className="muted">
        {step === 1
          ? 'Choose what matters to you. We’ll start with a few things that fit your life.'
          : 'Review the habits you selected. You can change your selections anytime.'}
      </p>
      <ErrorMessage error={storageError} />
      <div className="card">
        {step === 1 ? (
          <>
            <label htmlFor="name">
              What should we call you? <span className="muted">(optional)</span>
            </label>
            <input
              id="name"
              maxLength={40}
              autoComplete="given-name"
              value={name}
              placeholder="Your first name"
              onChange={(event) => setName(event.target.value)}
            />
            {loading && <p role="status">Loading habit suggestions…</p>}
            <fieldset>
              <legend>What would you like to work on? Choose 2–5.</legend>
              <div className="habit-template-grid">
                {Object.keys(presets).map((goal) => (
                  <button
                    key={goal}
                    aria-pressed={selected.includes(goal)}
                    className={`habit-template ${selected.includes(goal) ? 'is-selected' : ''}`}
                    onClick={() => {
                      if (selected.includes(goal))
                        setSelected(selected.filter((item) => item !== goal));
                      else if (selected.length < 5) setSelected([...selected, goal]);
                      else setError('Five is plenty to begin with.');
                    }}
                  >
                    {presets[goal]!.title}
                  </button>
                ))}
              </div>
            </fieldset>
            <label htmlFor="barrier">What most often gets in your way?</label>
            <select
              id="barrier"
              value={barrier}
              onChange={(event) => setBarrier(event.target.value as Reason)}
            >
              {reasons.map((reason) => (
                <option key={reason}>{reason}</option>
              ))}
            </select>
            <ErrorMessage error={error} />
            <div className="stepfoot">
              <small>Choose at least two habits. Five is the maximum.</small>
              <button
                className="primary"
                disabled={selected.length < 2 || !writable}
                onClick={next}
              >
                Shape my habits →
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            {selected.map((goal, index) => (
              <fieldset key={goal} className="onhabit">
                <legend>Habit {index + 1}</legend>
                <h3>{drafts[goal]!.title}</h3>
                <p>{drafts[goal]!.normal}</p>
                <small>{drafts[goal]!.time}</small>
              </fieldset>
            ))}
            <div className="callout">
              Choose a task you want to repeat. Your progress stays with you after a missed day.
            </div>
            <p className="note">
              Your selected habits are saved to your account. Completions and check-ins are still
              saved only in this browser.
            </p>
            <ErrorMessage error={error} />
            <div className="stepfoot">
              <button type="button" disabled={saving} onClick={() => setStep(1)}>
                ← Back
              </button>
              <button className="primary" disabled={saving || !writable}>
                {saving ? 'Saving your habits…' : 'Begin my first day →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
