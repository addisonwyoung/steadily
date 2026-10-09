import { formatDay } from '../../domain/dates';
import { getWeek } from '../../domain/selectors';
import { useSteadily } from '../../store/context';

export function WeekChart({ today }: { today: string }) {
  const data = useSteadily((state) => state.data);
  const week = getWeek(data, today);
  return (
    <div className="week" role="list" aria-label="Habit completions over the last seven days">
      {week.map(({ day, planned, completed, percent }) => (
        <div
          key={day}
          className="weekcol"
          role="listitem"
          aria-label={`${formatDay(day, { month: 'short', day: 'numeric' })}: ${completed} of ${planned} habits completed`}
        >
          <div className="bartrack" aria-hidden="true">
            <div className="bar" style={{ height: `${percent}%` }} />
          </div>
          <span aria-hidden="true">
            {formatDay(day, { weekday: 'short' }).slice(0, 1)}
            {day === today ? ' •' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
