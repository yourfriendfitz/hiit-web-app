import { describe, expect, it } from "vitest";

import { getCurrentProgramWeek } from "../../src/program-schedule";

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
