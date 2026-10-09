import { useState, type FormEvent } from 'react';
import { presets } from '../../domain/content';
import { reasons, habitInputSchema, type HabitInput, type Reason } from '../../domain/schema';
import { useSteadily } from '../../store/context';
import { Brand, ErrorMessage, errorMessage } from '../../components/ui';
import { HabitFields } from '../habits/habit-fields';

export function Onboarding() {
  const onboard = useSteadily((state) => state.onboard);
  const writable = useSteadily((state) => state.writable);
  const storageError = useSteadily((state) => state.storageError);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(['Move more', 'Read & learn']);
  const [barrier, setBarrier] = useState<Reason>('Distraction');
  const [drafts, setDrafts] = useState<Record<string, HabitInput>>({});
  const [error, setError] = useState<string | null>(null);
  function next() {
    setDrafts((previous) =>
      Object.fromEntries(selected.map((goal) => [goal, previous[goal] ?? presets[goal]!])),
    );
    setStep(2);
    setError(null);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const habits = selected.map((goal) => habitInputSchema.parse(drafts[goal]));
      onboard({ name, barrier }, habits);
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
          : 'Every habit gets a smaller version for the days when life happens.'}
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
            <fieldset>
              <legend>What would you like to work on? Choose 1–5.</legend>
              <div className="choices">
                {Object.keys(presets).map((goal) => (
                  <button
                    key={goal}
                    aria-pressed={selected.includes(goal)}
                    className={selected.includes(goal) ? 'active' : ''}
                    onClick={() => {
                      if (selected.includes(goal))
                        setSelected(selected.filter((item) => item !== goal));
                      else if (selected.length < 5) setSelected([...selected, goal]);
                      else setError('Five is plenty to begin with.');
                    }}
                  >
                    {goal}
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
              <small>Start with 1–3. Five is the maximum.</small>
              <button className="primary" disabled={!selected.length || !writable} onClick={next}>
                Shape my habits →
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            {selected.map((goal, index) => (
              <fieldset key={goal} className="onhabit">
                <legend>Habit {index + 1}</legend>
                <HabitFields
                  value={drafts[goal]!}
                  onChange={(value) => setDrafts({ ...drafts, [goal]: value })}
                />
              </fieldset>
            ))}
            <div className="callout">
              A minimum version counts as showing up. Your progress stays with you after a missed
              day.
            </div>
            <p className="note">
              Your habits and check-ins are saved only in this browser. No account or syncing.
              Clearing browser data removes them.
            </p>
            <ErrorMessage error={error} />
            <div className="stepfoot">
              <button type="button" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button className="primary">Begin my first day →</button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
