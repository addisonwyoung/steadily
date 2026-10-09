import { PageHeading } from '../../components/ui';
import { useSteadily } from '../../store/context';
import { useToday } from '../../lib/use-today';
import { formatDay } from '../../domain/dates';
import { getProgress, getRecommendation } from '../../domain/selectors';
import { WeekChart } from './week-chart';

export default function ProgressPage() {
  const data = useSteadily((state) => state.data);
  const today = useToday();
  const stats = getProgress(data, today);
  const checks = Object.entries(data.checks)
    .filter(([day]) => day <= today)
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, 7);
  const wins = checks.filter(([, check]) => check.win);
  return (
    <>
      <PageHeading
        title="Look how you’re showing up."
        description="Your whole journey counts, including the days you begin again."
      />
      <div className="metrics">
        <div className="card">
          <span className="stat">{stats.rate}%</span>
          <p>Habit completion</p>
        </div>
        <div className="card">
          <span className="stat">
            {stats.normal} <small>/ {stats.minimum}</small>
          </span>
          <p>Normal / minimum</p>
        </div>
        <div className="card">
          <span className="stat">{stats.returns}</span>
          <p>Times you returned</p>
        </div>
      </div>
      <div className="grid">
        <div className="stack">
          <section className="card">
            <h2>The last seven days</h2>
            <WeekChart today={today} />
            <p className="note">
              Normal and minimum versions both count. Rates include each planned day from the day
              you added a habit, including today.
            </p>
          </section>
          <section className="card">
            <h2>Your recent check-ins</h2>
            {checks.length ? (
              <>
                <table className="history">
                  <caption className="sr-only">
                    Recent mood, energy, and stress ratings from 1 to 5
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Day</th>
                      <th scope="col">Mood</th>
                      <th scope="col">Energy</th>
                      <th scope="col">Stress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map(([day, check]) => (
                      <tr key={day}>
                        <th scope="row">{formatDay(day, { month: 'short', day: 'numeric' })}</th>
                        <td>{check.mood}/5</td>
                        <td>{check.energy}/5</td>
                        <td>{check.stress}/5</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="note">1 is low · 5 is high</p>
              </>
            ) : (
              <p className="empty">
                Your first check-in starts the story. You don’t need a full week to begin.
              </p>
            )}
          </section>
        </div>
        <div className="stack">
          <section className="card focus">
            <span className="eyebrow">Your next gentle adjustment</span>
            <p className="suggestion">{getRecommendation(data, today)}</p>
          </section>
          <section className="card">
            <h2>Returning is progress.</h2>
            <p>
              {stats.returns
                ? `You have returned ${stats.returns} time${stats.returns === 1 ? '' : 's'} after a gap. Your average time back is ${stats.averageReturnDays?.toFixed(1)} days.`
                : 'When you complete a habit after a missed day, your return will appear here. There’s no streak to protect.'}
            </p>
            <small>A return means showing up again after at least one missed planned day.</small>
          </section>
          {wins.length > 0 && (
            <section className="card">
              <h2>Wins worth keeping</h2>
              {wins.map(([day, check]) => (
                <p key={day}>
                  {check.win}
                  <br />
                  <small>{formatDay(day, { month: 'short', day: 'numeric' })}</small>
                </p>
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
