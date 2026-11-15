import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon } from 'lucide-react';
import { useSteadily } from '../../store/context';
import { useToday } from '../../lib/use-today';
import { getRecommendation, isComplete } from '../../domain/selectors';
import { PageHeading, errorMessage } from '../../components/ui';
import { useFeedback } from '../../components/feedback';
import { HabitCard } from './habit-card';
import { CheckInDialog } from '../check-in/check-in-dialog';
import { ChallengeCard } from '../challenge/challenge-card';
import { WeekChart } from '../progress/week-chart';

export default function TodayPage() {
  const data = useSteadily((state) => state.data);
  const complete = useSteadily((state) => state.completeOnline);
  const saving = useSteadily((state) => state.completionSaving);
  const today = useToday();
  const notify = useFeedback();
  const [checkIn, setCheckIn] = useState(false);
  const focus = data.habits.find((habit) => habit.id === data.profile?.priority) ?? data.habits[0];
  const count = data.habits.filter((habit) => isComplete(data.logs[today]?.[habit.id])).length;
  if (!focus)
    return (
      <section className="card">
        <h1>Choose your next habit</h1>
        <p>Your habit list is empty. Pick up to five habits to get started.</p>
        <Link to="/habits">Choose habits →</Link>
      </section>
    );
  return (
    <>
      <PageHeading
        title="A little better, at your pace."
        description={`${data.profile?.name ? `${data.profile.name}, ` : ''}you don’t have to do it all. Just take the next small step.`}
        action={
          <button onClick={() => setCheckIn(true)}>
            <Moon size={16} />
            {data.checks[today] ? 'Check-in saved' : 'Evening check-in'}
          </button>
        }
      />
      <div className="grid">
        <div className="stack">
          <section className="card focus">
            <div className="row">
              <span className="eyebrow">✧ Today’s one important thing</span>
              <span className="badge">{focus.time}</span>
            </div>
            <h2>{focus.title}</h2>
            <p>{focus.normal}</p>
            <button
              className="primary"
              disabled={saving || isComplete(data.logs[today]?.[focus.id])}
              onClick={async () => {
                try {
                  await complete(focus.id);
                  notify('Habit completed.');
                } catch (err) {
                  notify(errorMessage(err));
                }
              }}
            >
              {isComplete(data.logs[today]?.[focus.id]) ? '✓ You showed up' : 'Complete habit →'}
            </button>
          </section>
          <section className="card">
            <div className="sectiontitle">
              <h2>Your small steps</h2>
              <small>
                {count} of {data.habits.length} today
              </small>
            </div>
            {data.habits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} today={today} />
            ))}
            <progress
              className="progressline"
              value={count}
              max={data.habits.length}
              aria-label="Today's habit completions"
            />
            <p className="note">
              {count === data.habits.length
                ? 'You made room for yourself today. That is enough.'
                : 'Choose a habit and take your next step.'}
            </p>
          </section>
          <section className="card row wrap">
            <div>
              <h3>A moment to notice.</h3>
              <small>
                {data.checks[today]
                  ? 'Your reflection is saved. Come back whenever you need.'
                  : 'How did today feel? A quick check-in helps you find your rhythm.'}
              </small>
            </div>
            <button onClick={() => setCheckIn(true)}>
              {data.checks[today] ? 'View check-in' : 'Finish my day →'}
            </button>
          </section>
        </div>
        <div className="stack rightstack">
          <ChallengeCard today={today} />
          <section className="card">
            <h2>Your week, gently.</h2>
            <WeekChart today={today} />
            <p className="note">
              Each filled bar is a day you showed up. Empty days don’t erase the others.
            </p>
            <Link className="textbutton progress-link" to="/progress">
              See my progress →
            </Link>
          </section>
          <section className="card">
            <span className="eyebrow">A small suggestion</span>
            <p className="suggestion">{getRecommendation(data, today)}</p>
          </section>
        </div>
      </div>
      {checkIn && <CheckInDialog key={today} today={today} onClose={() => setCheckIn(false)} />}
    </>
  );
}
