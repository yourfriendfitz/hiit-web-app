import { PROGRAM_START_DATE, type Workout, type WorkoutProgram } from "./types";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function getLocalCalendarDay(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export type RecentProgramWorkout = {
  date: Date;
  day: number;
  key: string;
  week: number;
  workout: Workout;
};

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

export function getRecentProgramWorkouts(
  program: WorkoutProgram,
  now = new Date(),
  lookbackDays = 2,
  startDate = PROGRAM_START_DATE,
) {
  const recentWorkouts: RecentProgramWorkout[] = [];
  const availableLookbackDays = Math.max(0, Math.floor(lookbackDays));

  for (let daysAgo = 1; daysAgo <= availableLookbackDays; daysAgo += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const daysSinceStart = Math.floor(
      (getLocalCalendarDay(date) - getLocalCalendarDay(startDate)) /
        MILLISECONDS_PER_DAY,
    );

    if (daysSinceStart < 0) {
      continue;
    }

    const week = Math.floor(daysSinceStart / 7);
    const day = daysSinceStart % 7;
    const workout = program[week]?.[day];

    if (!workout) {
      continue;
    }

    recentWorkouts.push({
      date,
      day,
      key: `${week}-${day}`,
      week,
      workout,
    });
  }

  return recentWorkouts;
}
