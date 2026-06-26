import { describe, expect, it } from "vitest";

import {
  PROGRAM_CYCLE_LENGTH_WEEKS,
  formatWorkoutScheduleLabel,
  getCurrentProgramWeek,
  getProgramCyclePosition,
  getRecentProgramWorkouts,
} from "../../src/program-schedule";
import type { Workout, WorkoutProgram } from "../../src/types";

const startDate = new Date("2025-07-28T00:00:00-05:00");

describe("getCurrentProgramWeek", () => {
  it("targets the first week before the program starts", () => {
    expect(
      getCurrentProgramWeek(
        48,
        new Date("2025-07-20T12:00:00-05:00"),
        startDate,
      ),
    ).toBe(0);
  });

  it("targets the expected week during the program", () => {
    expect(
      getCurrentProgramWeek(
        48,
        new Date("2025-08-13T12:00:00-05:00"),
        startDate,
      ),
    ).toBe(2);
  });

  it("targets the final week after the program ends", () => {
    expect(
      getCurrentProgramWeek(
        48,
        new Date("2027-01-01T12:00:00-06:00"),
        startDate,
      ),
    ).toBe(47);
  });

  it("handles an empty program safely", () => {
    expect(
      getCurrentProgramWeek(
        0,
        new Date("2025-08-13T12:00:00-05:00"),
        startDate,
      ),
    ).toBeNull();
  });

  it("uses calendar days across daylight-saving boundaries", () => {
    expect(
      getCurrentProgramWeek(
        48,
        new Date("2026-03-09T00:00:00-05:00"),
        new Date("2026-03-02T00:00:00-06:00"),
      ),
    ).toBe(1);
  });
});

describe("getProgramCyclePosition", () => {
  it("uses the authored 12-week cycle length", () => {
    expect(PROGRAM_CYCLE_LENGTH_WEEKS).toBe(12);
  });

  it("returns cycle context for the final week of cycle 4", () => {
    expect(getProgramCyclePosition(47, 96)).toEqual({
      cycle: 4,
      cycleLength: 12,
      cycleWeek: 12,
      programWeek: 48,
      totalCycles: 8,
    });
  });

  it("starts a new cycle after each 12-week block", () => {
    expect(getProgramCyclePosition(48, 96)).toEqual({
      cycle: 5,
      cycleLength: 12,
      cycleWeek: 1,
      programWeek: 49,
      totalCycles: 8,
    });
  });

  it("clamps cycle context to the authored program range", () => {
    expect(getProgramCyclePosition(120, 96)).toEqual({
      cycle: 8,
      cycleLength: 12,
      cycleWeek: 12,
      programWeek: 96,
      totalCycles: 8,
    });
  });

  it("formats workout schedule labels without global program week", () => {
    expect(formatWorkoutScheduleLabel(47, 5, 96)).toBe(
      "Cycle Week 12/12 • Day 5",
    );
  });
});

function makeWorkout(name: string): Workout {
  return {
    name,
    exercises: [],
  };
}

function makeWeek(name: string): Workout[] {
  return Array.from({ length: 5 }, (_, day) =>
    makeWorkout(`${name} Day ${day + 1}`),
  );
}

describe("getRecentProgramWorkouts", () => {
  const program: WorkoutProgram = [makeWeek("Week 1"), makeWeek("Week 2")];

  it("returns the previous two authored workouts most recent first", () => {
    const recentWorkouts = getRecentProgramWorkouts(
      program,
      new Date("2025-08-01T12:00:00-05:00"),
      2,
      startDate,
    );

    expect(
      recentWorkouts.map(({ day, week, workout }) => ({
        day,
        week,
        name: workout.name,
      })),
    ).toEqual([
      { day: 3, week: 0, name: "Week 1 Day 4" },
      { day: 2, week: 0, name: "Week 1 Day 3" },
    ]);
  });

  it("crosses a week boundary while skipping an unscheduled weekend", () => {
    const recentWorkouts = getRecentProgramWorkouts(
      program,
      new Date("2025-08-05T12:00:00-05:00"),
      2,
      startDate,
    );

    expect(recentWorkouts.map(({ key }) => key)).toEqual(["1-0", "0-4"]);
  });

  it("returns the previous two workouts when a weekend separates them from Monday", () => {
    const recentWorkouts = getRecentProgramWorkouts(
      program,
      new Date("2025-08-04T12:00:00-05:00"),
      2,
      startDate,
    );

    expect(
      recentWorkouts.map(({ date, key, workout }) => ({
        date: date.toISOString(),
        key,
        name: workout.name,
      })),
    ).toEqual([
      {
        date: "2025-08-01T17:00:00.000Z",
        key: "0-4",
        name: "Week 1 Day 5",
      },
      {
        date: "2025-07-31T17:00:00.000Z",
        key: "0-3",
        name: "Week 1 Day 4",
      },
    ]);
  });

  it("does not clamp candidate dates before the authored program", () => {
    expect(
      getRecentProgramWorkouts(
        program,
        new Date("2025-07-28T12:00:00-05:00"),
        2,
        startDate,
      ),
    ).toEqual([]);
  });

  it("returns the final authored workouts after the program range", () => {
    expect(
      getRecentProgramWorkouts(
        [makeWeek("Week 1")],
        new Date("2025-08-13T12:00:00-05:00"),
        2,
        startDate,
      ),
    ).toMatchObject([
      { key: "0-4", workout: { name: "Week 1 Day 5" } },
      { key: "0-3", workout: { name: "Week 1 Day 4" } },
    ]);
  });
});
