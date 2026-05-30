import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  validateExerciseMetadata,
  validateWorkoutProgram,
} from "../../src/data";

const readJson = (fileName) =>
  JSON.parse(
    readFileSync(new URL(`../../public/${fileName}`, import.meta.url)),
  );

const fileHash = (fileName) =>
  createHash("sha256")
    .update(readFileSync(new URL(`../../public/${fileName}`, import.meta.url)))
    .digest("hex");

describe("workout data contract", () => {
  it("keeps the expert-authored workout source unchanged", () => {
    expect(fileHash("data.json")).toBe(
      "55e4ebd015f3c219e5bbf03a04be47f59a6151aabaa840c8b90b642626ffbb53",
    );
  });

  it("keeps the exercise metadata source unchanged", () => {
    expect(fileHash("exercises.json")).toBe(
      "e6e67616f44d622c37a90cb35d1fe33c98993fce18d64725e328740054f298b5",
    );
  });

  it("has weeks, days, and workout exercise slots", () => {
    const data = validateWorkoutProgram(readJson("data.json"));

    expect(data).toHaveLength(48);
    expect(data.every((week) => week.length === 5)).toBe(true);

    for (const week of data) {
      for (const workout of week) {
        expect(workout).toEqual(
          expect.objectContaining({
            exercises: expect.any(Array),
            name: expect.any(String),
          }),
        );
        expect(workout.exercises.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps free-text-compatible exercise programming fields", () => {
    const data = validateWorkoutProgram(readJson("data.json"));

    for (const week of data) {
      for (const workout of week) {
        for (const exercise of workout.exercises) {
          expect(exercise).toEqual(
            expect.objectContaining({
              id: expect.any(String),
              notes: expect.any(String),
              repsOrDuration: expect.anything(),
              rest: expect.any(String),
              rpeOrPercent: expect.anything(),
              warmupSets: expect.any(Number),
              workingSets: expect.any(Number),
            }),
          );
        }
      }
    }
  });

  it("keeps exercise metadata typed and loadable", () => {
    const exercises = validateExerciseMetadata(readJson("exercises.json"));

    expect(exercises).toHaveLength(111);
    expect(exercises[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
      }),
    );
  });

  it("rejects malformed workout data at the typed boundary", () => {
    expect(() =>
      validateWorkoutProgram([[{ name: "Bad Workout", exercises: [{}] }]]),
    ).toThrow(/missing id/);
  });
});
