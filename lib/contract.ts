export const DEFAULT_CONTRACT_HOURS_PER_WEEK = 16;

/** Calendar-week norm used consistently by roster and salary views. */
export function weeksStartingInMonth(period: string): number {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) return 0;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return 0;

  const days = new Date(year, month, 0).getDate();
  let mondays = 0;
  for (let day = 1; day <= days; day += 1) {
    if (new Date(year, month - 1, day).getDay() === 1) mondays += 1;
  }
  return mondays;
}

export function contractHoursForCalendarMonth(
  period: string,
  hoursPerWeek = DEFAULT_CONTRACT_HOURS_PER_WEEK,
): number {
  return Math.round(weeksStartingInMonth(period) * hoursPerWeek * 10) / 10;
}
