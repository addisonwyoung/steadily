import { formatDay, localDay } from '../../domain/dates';
import { focusReport } from './focus-sessions';
import { usePomodoro } from './pomodoro';

export function FocusReport() {
  const timer = usePomodoro();
  const report = focusReport(timer.sessions, timer.today);
  const maximum = Math.max(60, ...report.days.map((day) => day.seconds));
  const recent = timer.sessions
    .filter((session) =>
      report.days.some((day) => day.day === localDay(new Date(session.completedAt))),
    )
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 10);
  return (
    <section className="card focus-report" aria-labelledby="focus-report-title">
      <div className="row wrap">
        <div>
          <span className="eyebrow">Your focus, over time</span>
          <h2 id="focus-report-title">The last seven days</h2>
        </div>
        <button disabled={timer.historyLoading} onClick={timer.reloadHistory}>
          Refresh history
        </button>
      </div>
      <p>Completed focus sessions count here. Breaks and reset timers do not.</p>
      {timer.historyLoading && <p role="status">Loading focus history…</p>}
      {timer.historyError && <p role="alert">{timer.historyError} Totals may be incomplete.</p>}
      {!timer.historyLoading && (!timer.historyError || timer.sessions.length > 0) && (
        <>
          <div className="focus-summary">
            <div>
              <strong>{Math.round(report.seconds / 60)}</strong>
              <span>minutes focused</span>
            </div>
            <div>
              <strong>{report.sessions}</strong>
              <span>sessions completed</span>
            </div>
            <div>
              <strong>{report.habits.length}</strong>
              <span>habits practiced</span>
            </div>
          </div>
          <div
            className="focus-bars"
            role="img"
            aria-label={report.days
              .map((day) => `${day.day}: ${Math.round(day.seconds / 60)} minutes`)
              .join('; ')}
          >
            {report.days.map((day) => (
              <div className="focus-bar-column" key={day.day}>
                <span>{Math.round(day.seconds / 60)}m</span>
                <div className="focus-bar-track">
                  <div style={{ height: `${(day.seconds / maximum) * 100}%` }} />
                </div>
                <small>{formatDay(day.day, { weekday: 'short' })}</small>
              </div>
            ))}
          </div>
          {report.sessions === 0 ? (
            <p className="empty">Finish your first focus session to start your weekly report.</p>
          ) : (
            <>
              <h3>Where your time went</h3>
              <ul className="focus-habit-totals">
                {report.habits.map((habit) => (
                  <li key={habit.id}>
                    <span>{habit.title}</span>
                    <strong>
                      {Math.round(habit.seconds / 60)} min · {habit.sessions} session
                      {habit.sessions === 1 ? '' : 's'}
                    </strong>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3>Recent sessions</h3>
          {recent.length === 0 ? (
            <p>No saved sessions in this reporting window yet.</p>
          ) : (
            <div className="focus-history-scroll">
              <table className="history">
                <caption className="sr-only">
                  Your ten most recent completed focus sessions from the last seven days
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Habit</th>
                    <th scope="col">Finished</th>
                    <th scope="col">Focus</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((session) => (
                    <tr key={session.id}>
                      <th scope="row">{session.habitTitle}</th>
                      <td>
                        <time dateTime={session.completedAt}>
                          {new Date(session.completedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </time>
                      </td>
                      <td>{Math.round(session.durationSeconds / 60)} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
