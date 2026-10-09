import { challenges } from '../../domain/content';
import { PageHeading } from '../../components/ui';
import { useSteadily } from '../../store/context';
import { useToday } from '../../lib/use-today';
import { ChallengeCard } from './challenge-card';

export default function ChallengePage() {
  const entries = useSteadily((state) => state.data.challenge);
  const today = useToday();
  return (
    <>
      <PageHeading
        title="A little less noise."
        description="Seven small invitations to spend time offline. No rush, no restart."
      />
      <div className="grid">
        <div className="stack">
          <ChallengeCard today={today} />
          <section className="card">
            <h2>Your seven invitations</h2>
            {challenges.map((task, index) => (
              <div className="habit" key={task.title}>
                <div className="row">
                  <h3>
                    {index + 1}. {task.title}
                  </h3>
                  {entries[index] && <span aria-label="Completed">✓</span>}
                </div>
                <p>{task.description}</p>
                {entries[index] && (
                  <p className="status">
                    Difficulty {entries[index].difficulty}/5 · Enjoyment {entries[index].enjoyment}
                    /5
                  </p>
                )}
              </div>
            ))}
          </section>
        </div>
        <aside className="stack">
          <div className="card">
            <h2>Make room for real life.</h2>
            <p>
              This isn’t a medical “dopamine reset.” It’s an experiment in noticing how simple,
              screen-free moments feel.
            </p>
            <p className="muted">
              Try one activity a day. If you miss a day, continue where you left off. There is no
              timer to beat.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
