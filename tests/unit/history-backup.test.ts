import { describe, expect, it } from "vitest";

import {
  createWeightHistoryBackup,
  getWeightHistoryBackupFileName,
  parseWeightHistoryBackup,
  planWeightHistoryImport,
  serializeWeightHistoryBackup,
  WeightHistoryBackupError,
} from "../../src/history-backup";

describe("history backup", () => {
  it("serializes a versioned backup with normalized dates", () => {
    const backup = createWeightHistoryBackup(
      [
        {
          id: "row",
          weight: "135",
          date: new Date("2026-06-02T12:00:00.000Z"),
        },
        {
          id: "press",
          weight: "95",
          date: "2026-06-01T12:00:00.000Z",
        },
      ],
      "2026-06-26T20:32:30.000Z",
    );

    expect(backup).toEqual({
      app: "hiit-web-app",
      format: "weights-backup",
      formatVersion: 1,
      exportedAt: "2026-06-26T20:32:30.000Z",
      recordCount: 2,
      records: [
        {
          id: "press",
          weight: "95",
          date: "2026-06-01T12:00:00.000Z",
        },
        {
          id: "row",
          weight: "135",
          date: "2026-06-02T12:00:00.000Z",
        },
      ],
    });
    expect(serializeWeightHistoryBackup(backup)).toContain(
      '"format": "weights-backup"',
    );
  });

  it("uses the export date in the backup filename", () => {
    expect(getWeightHistoryBackupFileName("2026-06-26T20:32:30.000Z")).toBe(
      "hiit-history-backup-2026-06-26.json",
    );
  });

  it("parses a valid backup", () => {
    const backup = parseWeightHistoryBackup(
      JSON.stringify({
        app: "hiit-web-app",
        format: "weights-backup",
        formatVersion: 1,
        exportedAt: "2026-06-26T20:32:30.000Z",
        recordCount: 1,
        records: [
          {
            id: "press",
            weight: "95",
            date: "2026-06-01T12:00:00.000Z",
          },
        ],
      }),
    );

    expect(backup.records).toEqual([
      {
        id: "press",
        weight: "95",
        date: "2026-06-01T12:00:00.000Z",
      },
    ]);
  });

  it("rejects malformed backups without returning partial records", () => {
    expect(() => parseWeightHistoryBackup("{")).toThrow(
      new WeightHistoryBackupError("Backup file is not valid JSON."),
    );
    expect(() =>
      parseWeightHistoryBackup(
        JSON.stringify({
          app: "other-app",
          format: "weights-backup",
          formatVersion: 1,
          exportedAt: "2026-06-26T20:32:30.000Z",
          recordCount: 0,
          records: [],
        }),
      ),
    ).toThrow("different app");
    expect(() =>
      parseWeightHistoryBackup(
        JSON.stringify({
          app: "hiit-web-app",
          format: "weights-backup",
          formatVersion: 1,
          exportedAt: "2026-06-26T20:32:30.000Z",
          recordCount: 1,
          records: [
            {
              id: "press",
              weight: "95",
              date: "not-a-date",
            },
          ],
        }),
      ),
    ).toThrow("invalid date");
  });

  it("plans a merge-only import and skips exact duplicates", () => {
    const importPlan = planWeightHistoryImport(
      [
        {
          id: "press",
          weight: "95",
          date: new Date("2026-06-01T12:00:00.000Z"),
        },
      ],
      [
        {
          id: "press",
          weight: "95",
          date: "2026-06-01T12:00:00.000Z",
        },
        {
          id: "press",
          weight: "105",
          date: "2026-06-02T12:00:00.000Z",
        },
        {
          id: "press",
          weight: "105",
          date: "2026-06-02T12:00:00.000Z",
        },
      ],
    );

    expect(importPlan).toEqual({
      skippedDuplicates: 2,
      recordsToImport: [
        {
          id: "press",
          weight: "105",
          date: "2026-06-02T12:00:00.000Z",
        },
      ],
    });
  });
});
