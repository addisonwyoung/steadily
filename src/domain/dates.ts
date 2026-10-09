/** Calendar days use local time. Never derive them by slicing a UTC ISO timestamp. */
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return localDay(date);
}

/** UTC is used only for the difference between two calendar dates, avoiding DST offsets. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function recentDays(today: string, length = 7): string[] {
  return Array.from({ length }, (_, index) => addDays(today, index - length + 1));
}

export function formatDay(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString('en-US', options);
}
