import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const readJson = (fileName) =>
  JSON.parse(readFileSync(new URL(`../../${fileName}`, import.meta.url)));

const fileHash = (fileName) =>
  createHash("sha256")
    .update(readFileSync(new URL(`../../${fileName}`, import.meta.url)))
    .digest("hex");

describe("workout data contract", () => {
  it("keeps the expert-authored workout source unchanged", () => {
    expect(fileHash("data.json")).toBe(
      "9c834dd34741ecfdef119fe1bd05b7f5eb437bfa2fc952247f82856f7db9449e",
    );
  });

  it("keeps the exercise metadata source unchanged", () => {
    expect(fileHash("exercises.json")).toBe(
      "36cbddbb5eb0237d426c728482853beeb55bf03a5796ff30b70d9b39017e8487",
    );
  });

  it("has weeks, days, and workout exercise slots", () => {
    const data = readJson("data.json");

    expect(data).toHaveLength(12);
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
    const data = readJson("data.json");

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
});
