import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, localDay } from './dates';
import { getProgress, getRecommendation, getWeek } from './selectors';
import { emptyData } from './schema';
import { fixture } from '../test/fixtures';

describe('calendar dates', () => {
  it('uses local calendar components, including around midnight', () => {
    expect(localDay(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01');
  });
  it('counts calendar days across month and daylight-saving boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });
});
describe('recovery-focused progress', () => {
  it('counts each return once across implicit and explicit missed days', () => {
    const data = fixture();
    data.logs = {
      '2026-09-01': { walk: { type: 'normal' } },
      '2026-09-02': { walk: { type: 'missed', reason: 'Tiredness' } },
      '2026-09-04': { walk: { type: 'minimum' } },
      '2026-09-05': { walk: { type: 'normal' } },
      '2026-09-07': { walk: { type: 'normal' } },
      '2026-09-10': { walk: { type: 'normal' } },
    };
    expect(getProgress(data, '2026-09-07')).toEqual({
      normal: 3,
      minimum: 1,
      total: 7,
      returns: 2,
      rate: 57,
      averageReturnDays: 1.5,
    });
  });
  it('does not call the first completion a return and handles an empty account', () => {
    const data = fixture();
    data.logs = { '2026-09-05': { walk: { type: 'minimum' } } };
    expect(getProgress(data, '2026-09-05').returns).toBe(0);
    expect(getProgress(emptyData(), '2026-09-05').rate).toBe(0);
  });
  it('uses only habits that existed on each day of the weekly chart', () => {
    const data = fixture();
    data.habits.push({ ...data.habits[0]!, id: 'read', created: '2026-09-04' });
    data.logs = { '2026-09-02': { walk: { type: 'minimum' } } };
    const week = getWeek(data, '2026-09-07');
    expect(week[1]).toMatchObject({ planned: 1, completed: 1, percent: 100 });
    expect(week[3]?.planned).toBe(2);
  });
});
describe('rule-based recommendations', () => {
  it('uses recent low energy only when enough check-ins support it', () => {
    const data = fixture();
    const check = { mood: 3, energy: 1, stress: 3, win: '' };
    data.checks = { '2026-09-01': check, '2026-09-02': check, '2026-09-03': check };
    expect(getRecommendation(data, '2026-09-04')).toContain('low energy');
    expect(getRecommendation(data, '2026-09-15')).not.toContain('low energy');
  });
  it('prefers the latest reason rather than object insertion order', () => {
    const data = fixture();
    data.logs = {
      '2026-09-05': { walk: { type: 'missed', reason: 'Forgetting' } },
      '2026-09-02': { walk: { type: 'missed', reason: 'Tiredness' } },
    };
    expect(getRecommendation(data, '2026-09-06')).toContain('familiar routine');
  });
});
