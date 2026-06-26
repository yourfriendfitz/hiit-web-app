import { PROGRAM_START_DATE, type Workout, type WorkoutProgram } from "./types";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
export const PROGRAM_CYCLE_LENGTH_WEEKS = 12;

function getLocalCalendarDay(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function getPositiveInteger(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const integer = Math.floor(value);
  return integer > 0 ? integer : fallback;
}

function getNonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export type RecentProgramWorkout = {
  date: Date;
  day: number;
  key: string;
  week: number;
  workout: Workout;
};

export type ProgramCyclePosition = {
  cycle: number;
  cycleLength: number;
  cycleWeek: number;
  programWeek: number;
  totalCycles: number;
};

export function getProgramCyclePosition(
  weekIndex: number,
  programLength: number,
  cycleLength = PROGRAM_CYCLE_LENGTH_WEEKS,
): ProgramCyclePosition {
  const availableWeeks = getNonNegativeInteger(programLength);
  const normalizedCycleLength = getPositiveInteger(cycleLength, 1);
  const normalizedWeekIndex = Math.min(
    getNonNegativeInteger(weekIndex),
    Math.max(availableWeeks - 1, 0),
  );

  return {
    cycle: Math.floor(normalizedWeekIndex / normalizedCycleLength) + 1,
    cycleLength: normalizedCycleLength,
    cycleWeek: (normalizedWeekIndex % normalizedCycleLength) + 1,
    programWeek: normalizedWeekIndex + 1,
    totalCycles:
      availableWeeks === 0
        ? 0
        : Math.ceil(availableWeeks / normalizedCycleLength),
  };
}

export function formatWorkoutScheduleLabel(
  weekIndex: number,
  day: number,
  programLength: number,
) {
  const cyclePosition = getProgramCyclePosition(weekIndex, programLength);

  return `Cycle Week ${cyclePosition.cycleWeek}/${cyclePosition.cycleLength} • Day ${day}`;
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

export function getRecentProgramWorkouts(
  program: WorkoutProgram,
  now = new Date(),
  maximumWorkouts = 2,
  startDate = PROGRAM_START_DATE,
) {
  const recentWorkouts: RecentProgramWorkout[] = [];
  const availableWorkoutSlots = Math.max(0, Math.floor(maximumWorkouts));
  const date = new Date(now);

  while (recentWorkouts.length < availableWorkoutSlots) {
    date.setDate(date.getDate() - 1);

    const daysSinceStart = Math.floor(
      (getLocalCalendarDay(date) - getLocalCalendarDay(startDate)) /
        MILLISECONDS_PER_DAY,
    );

    if (daysSinceStart < 0) {
      break;
    }

    const week = Math.floor(daysSinceStart / 7);
    const day = daysSinceStart % 7;
    const workout = program[week]?.[day];

    if (!workout) {
      continue;
    }

    recentWorkouts.push({
      date: new Date(date),
      day,
      key: `${week}-${day}`,
      week,
      workout,
    });
  }

  return recentWorkouts;
}
