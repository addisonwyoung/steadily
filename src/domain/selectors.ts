import { daysBetween, recentDays } from './dates';
import { suggestions } from './content';
import type { AppData, Completion } from './schema';

export const isComplete = (entry?: Completion): boolean =>
  entry?.type === 'normal' || entry?.type === 'minimum';

/** O(habits × logged days), independent of the number of empty days since onboarding. */
export function getProgress(data: AppData, today: string) {
  let normal = 0;
  let minimum = 0;
  let total = 0;
  const returnDays: number[] = [];
  const loggedDates = Object.keys(data.logs)
    .filter((day) => day <= today)
    .sort();
  for (const habit of data.habits) {
    if (habit.created > today) continue;
    total += daysBetween(habit.created, today) + 1;
    let lastCompleted: string | undefined;
    for (const day of loggedDates) {
      if (day < habit.created) continue;
      const entry = data.logs[day]?.[habit.id];
      if (!isComplete(entry)) continue;
      if (entry?.type === 'normal') normal++;
      else minimum++;
      if (lastCompleted) {
        const distance = daysBetween(lastCompleted, day);
        if (distance > 1) returnDays.push(distance - 1);
      }
      lastCompleted = day;
    }
  }
  return {
    normal,
    minimum,
    total,
    returns: returnDays.length,
    rate: total ? Math.round(((normal + minimum) / total) * 100) : 0,
    averageReturnDays: returnDays.length
      ? returnDays.reduce((sum, days) => sum + days, 0) / returnDays.length
      : null,
  };
}

export function getWeek(data: AppData, today: string) {
  return recentDays(today).map((day) => {
    const planned = data.habits.filter((habit) => habit.created <= day);
    const completed = planned.filter((habit) => isComplete(data.logs[day]?.[habit.id])).length;
    return {
      day,
      planned: planned.length,
      completed,
      percent: planned.length ? (completed / planned.length) * 100 : 0,
    };
  });
}

export function getRecommendation(data: AppData, today: string): string {
  const earliest = recentDays(today)[0]!;
  const checks = Object.entries(data.checks).filter(([day]) => day >= earliest && day <= today);
  if (checks.length >= 3 && checks.filter(([, entry]) => entry.energy <= 2).length >= 2) {
    return 'You recorded low energy on at least two recent days. Try your minimum versions and move one habit to an easier time.';
  }
  const latestReason = Object.entries(data.logs)
    .filter(([day]) => day <= today)
    .sort(([left], [right]) => right.localeCompare(left))
    .flatMap(([, entries]) => Object.values(entries))
    .find((entry) => entry.reason)?.reason;
  return suggestions[latestReason ?? data.profile?.barrier ?? 'Distraction'];
}
