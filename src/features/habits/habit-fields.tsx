import { useId } from 'react';
import { times, type HabitInput } from '../../domain/schema';

export function HabitFields({
  value,
  onChange,
}: {
  value: HabitInput;
  onChange(value: HabitInput): void;
}) {
  const prefix = useId();
  return (
    <>
      <label htmlFor={`${prefix}-title`}>Habit</label>
      <input
        id={`${prefix}-title`}
        value={value.title}
        required
        maxLength={80}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
      />
      <div className="formgrid">
        <div>
          <label htmlFor={`${prefix}-normal`}>Task</label>
          <input
            id={`${prefix}-normal`}
            value={value.normal}
            required
            maxLength={160}
            onChange={(event) => onChange({ ...value, normal: event.target.value })}
          />
        </div>
      </div>
      <label htmlFor={`${prefix}-time`}>Best time</label>
      <select
        id={`${prefix}-time`}
        value={value.time}
        onChange={(event) => onChange({ ...value, time: event.target.value as HabitInput['time'] })}
      >
        {times.map((time) => (
          <option key={time}>{time}</option>
        ))}
      </select>
    </>
  );
}
