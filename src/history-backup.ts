import type { WeightRecord } from "./types";

export const WEIGHT_BACKUP_APP = "hiit-web-app";
export const WEIGHT_BACKUP_FORMAT = "weights-backup";
export const WEIGHT_BACKUP_FORMAT_VERSION = 1;

export type BackupWeightRecord = {
  id: string;
  weight: string;
  date: string;
};

export type WeightHistoryBackup = {
  app: typeof WEIGHT_BACKUP_APP;
  format: typeof WEIGHT_BACKUP_FORMAT;
  formatVersion: typeof WEIGHT_BACKUP_FORMAT_VERSION;
  exportedAt: string;
  recordCount: number;
  records: BackupWeightRecord[];
};

export type WeightHistoryImportPlan = {
  recordsToImport: BackupWeightRecord[];
  skippedDuplicates: number;
};

export class WeightHistoryBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeightHistoryBackupError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDate(value: Date | string, label: string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new WeightHistoryBackupError(`${label} has an invalid date.`);
  }

  return date.toISOString();
}

function assertString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new WeightHistoryBackupError(`${label} must be a non-empty string.`);
  }

  return value;
}

export function normalizeWeightRecord(
  record: WeightRecord,
  label = "Record",
): BackupWeightRecord {
  return {
    id: assertString(record.id, `${label} id`),
    weight: assertString(record.weight, `${label} weight`),
    date: normalizeDate(record.date, `${label} date`),
  };
}

function normalizeBackupRecord(
  value: unknown,
  index: number,
): BackupWeightRecord {
  if (!isObject(value)) {
    throw new WeightHistoryBackupError(
      `Record ${index + 1} must be an object.`,
    );
  }

  return normalizeWeightRecord(
    {
      id: value.id,
      weight: value.weight,
      date: value.date,
    } as WeightRecord,
    `Record ${index + 1}`,
  );
}

function compareRecords(first: BackupWeightRecord, second: BackupWeightRecord) {
  const byDate = first.date.localeCompare(second.date);
  if (byDate !== 0) {
    return byDate;
  }

  const byId = first.id.localeCompare(second.id);
  if (byId !== 0) {
    return byId;
  }

  return first.weight.localeCompare(second.weight);
}

export function createWeightHistoryBackup(
  records: WeightRecord[],
  exportedAt: Date | string = new Date(),
): WeightHistoryBackup {
  const normalizedRecords = records.map((record, index) =>
    normalizeWeightRecord(record, `Record ${index + 1}`),
  );

  normalizedRecords.sort(compareRecords);

  return {
    app: WEIGHT_BACKUP_APP,
    format: WEIGHT_BACKUP_FORMAT,
    formatVersion: WEIGHT_BACKUP_FORMAT_VERSION,
    exportedAt: normalizeDate(exportedAt, "Export timestamp"),
    recordCount: normalizedRecords.length,
    records: normalizedRecords,
  };
}

export function serializeWeightHistoryBackup(backup: WeightHistoryBackup) {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function getWeightHistoryBackupFileName(
  exportedAt: Date | string = new Date(),
) {
  return `hiit-history-backup-${normalizeDate(exportedAt, "Export timestamp").slice(0, 10)}.json`;
}

export function parseWeightHistoryBackup(contents: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new WeightHistoryBackupError("Backup file is not valid JSON.");
  }

  if (!isObject(parsed)) {
    throw new WeightHistoryBackupError("Backup file must be a JSON object.");
  }

  if (parsed.app !== WEIGHT_BACKUP_APP) {
    throw new WeightHistoryBackupError("Backup file is for a different app.");
  }

  if (parsed.format !== WEIGHT_BACKUP_FORMAT) {
    throw new WeightHistoryBackupError(
      "Backup file has an unsupported format.",
    );
  }

  if (parsed.formatVersion !== WEIGHT_BACKUP_FORMAT_VERSION) {
    throw new WeightHistoryBackupError(
      "Backup file has an unsupported version.",
    );
  }

  if (!Array.isArray(parsed.records)) {
    throw new WeightHistoryBackupError("Backup file is missing records.");
  }

  if (
    typeof parsed.recordCount !== "number" ||
    parsed.recordCount !== parsed.records.length
  ) {
    throw new WeightHistoryBackupError("Backup file record count is invalid.");
  }

  return {
    app: WEIGHT_BACKUP_APP,
    format: WEIGHT_BACKUP_FORMAT,
    formatVersion: WEIGHT_BACKUP_FORMAT_VERSION,
    exportedAt: normalizeDate(
      assertString(parsed.exportedAt, "Export timestamp"),
      "Export timestamp",
    ),
    recordCount: parsed.records.length,
    records: parsed.records.map(normalizeBackupRecord).sort(compareRecords),
  } satisfies WeightHistoryBackup;
}

export function getWeightRecordKey(record: WeightRecord) {
  const normalizedRecord = normalizeWeightRecord(record);
  return `${normalizedRecord.id}\u0000${normalizedRecord.weight}\u0000${normalizedRecord.date}`;
}

export function planWeightHistoryImport(
  existingRecords: WeightRecord[],
  incomingRecords: WeightRecord[],
): WeightHistoryImportPlan {
  const seenKeys = new Set(existingRecords.map(getWeightRecordKey));
  const recordsToImport: BackupWeightRecord[] = [];
  let skippedDuplicates = 0;

  incomingRecords.forEach((record, index) => {
    const normalizedRecord = normalizeWeightRecord(
      record,
      `Record ${index + 1}`,
    );
    const key = getWeightRecordKey(normalizedRecord);

    if (seenKeys.has(key)) {
      skippedDuplicates += 1;
      return;
    }

    seenKeys.add(key);
    recordsToImport.push(normalizedRecord);
  });

  return {
    recordsToImport,
    skippedDuplicates,
  };
}
