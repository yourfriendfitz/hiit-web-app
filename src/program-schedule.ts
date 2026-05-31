import { PROGRAM_START_DATE } from "./types";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function getLocalCalendarDay(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getCurrentProgramWeek(
  programLength: number,
  now = new Date(),
  startDate = PROGRAM_START_DATE,
) {
  const availableWeeks = Math.max(0, Math.floor(programLength));

  if (availableWeeks === 0) {
    return null;
  }

  const daysSinceStart = Math.floor(
    (getLocalCalendarDay(now) - getLocalCalendarDay(startDate)) /
      MILLISECONDS_PER_DAY,
  );
  const weekSinceStart = Math.floor(daysSinceStart / 7);

  return Math.min(Math.max(weekSinceStart, 0), availableWeeks - 1);
}
