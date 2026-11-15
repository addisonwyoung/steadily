import { describe, expect, it } from 'vitest';
import { focusReport, focusSessionSchema, type SavedFocusSession } from './focus-sessions';
import { finishTimer, newTimer, timerSchema } from './focus-timer';
const id = 'a1111111-1111-4111-8111-111111111111';
const session = (day: string, minutes = 25): SavedFocusSession => ({
  id,
  habitId: 'read',
  habitTitle: 'Read',
  startedAt: new Date(`${day}T09:00:00`).toISOString(),
  completedAt: new Date(`${day}T10:00:00`).toISOString(),
  durationSeconds: minutes * 60,
});
describe('focus report', () => {
  it('groups by local completion day, includes empty days, and deduplicates IDs', () => {
    const a = session('2026-11-07');
    const b = { ...session('2026-11-06', 15), id: 'b1111111-1111-4111-8111-111111111111' };
    const old = { ...session('2026-10-31'), id: 'c1111111-1111-4111-8111-111111111111' };
    const report = focusReport([a, a, b, old], '2026-11-07');
    expect(report.days).toHaveLength(7);
    expect(report.sessions).toBe(2);
    expect(report.seconds).toBe(40 * 60);
    expect(report.habits[0]).toMatchObject({ title: 'Read', seconds: 2400, sessions: 2 });
    expect(report.days[0]?.seconds).toBe(0);
  });
  it('rejects incomplete sessions', () => {
    expect(() =>
      focusSessionSchema.parse({
        ...session('2026-11-07'),
        completedAt: session('2026-11-07').startedAt,
      }),
    ).toThrow();
  });
});
it('finishes once at the deadline rather than the time the tab woke up', () => {
  const start = Date.parse('2026-11-07T09:00:00Z');
  const timer = {
    ...newTimer(),
    lengths: { focus: 1, break: 2 },
    remaining: 60,
    deadline: start + 60000,
    selectedHabitId: 'read',
    active: { id, habitId: 'read', startedAt: new Date(start).toISOString(), durationSeconds: 60 },
  };
  const finished = finishTimer(timer, start + 3600000);
  expect(finished.pending).toHaveLength(1);
  expect(finished.pending[0]?.completedAt).toBe('2026-11-07T09:01:00.000Z');
  expect(finishTimer(finished, start + 3601000)).toBe(finished);
  expect(finished.mode).toBe('break');
});
it('rejects invalid recovery state instead of crediting a fake session', () => {
  expect(() => timerSchema.parse({ ...newTimer(), deadline: Date.now() + 1000 })).toThrow();
});
