import {
  ChevronDown,
  Download,
  Search,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Toastify from "toastify-js";

import {
  createWeightHistoryBackup,
  getWeightHistoryBackupFileName,
  parseWeightHistoryBackup,
  planWeightHistoryImport,
  serializeWeightHistoryBackup,
} from "../history-backup";
import { getAllWeights, importWeights } from "../storage";
import type { ExerciseMetadata, WeightRecord } from "../types";

function showHistoryToast(text: string) {
  Toastify({
    text,
    duration: 2500,
    gravity: "bottom",
    position: "center",
    stopOnFocus: true,
    className: "toastify",
  }).showToast();
}

function describeRecordCount(count: number) {
  return `${count} ${count === 1 ? "record" : "records"}`;
}

function compareWeightRecordsByNewest(
  first: WeightRecord,
  second: WeightRecord,
) {
  return new Date(second.date).getTime() - new Date(first.date).getTime();
}

export function HistoryPage({ exercises }: { exercises: ExerciseMetadata[] }) {
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [filter, setFilter] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [backupStatus, setBackupStatus] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const update = () => {
      void getAllWeights().then(setWeights);
    };

    update();
    window.addEventListener("dbUpdated", update);

    return () => window.removeEventListener("dbUpdated", update);
  }, []);

  const exerciseMap = useMemo(
    () =>
      exercises.reduce<Record<string, string>>((map, exercise) => {
        map[exercise.id] = exercise.name;
        return map;
      }, {}),
    [exercises],
  );

  const groupedWeights = useMemo(() => {
    const normalizedFilter = filter.toLowerCase();
    const filteredWeights = weights.filter((weight) =>
      (exerciseMap[weight.id] || weight.id)
        .toLowerCase()
        .includes(normalizedFilter),
    );

    const groups = filteredWeights.reduce<Record<string, WeightRecord[]>>(
      (groups, weight) => {
        groups[weight.id] = groups[weight.id] || [];
        groups[weight.id].push(weight);
        return groups;
      },
      {},
    );

    Object.values(groups).forEach((entries) => {
      entries.sort(compareWeightRecordsByNewest);
    });

    return groups;
  }, [exerciseMap, filter, weights]);

  const groupIds = Object.keys(groupedWeights);

  const toggleId = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const exportHistory = async () => {
    try {
      const records = await getAllWeights();

      if (records.length === 0) {
        const text = "No history to export yet.";
        setBackupStatus({ tone: "error", text });
        showHistoryToast(text);
        return;
      }

      const backup = createWeightHistoryBackup(records);
      const blob = new Blob([serializeWeightHistoryBackup(backup)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getWeightHistoryBackupFileName(backup.exportedAt);
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);

      const text = `Exported ${describeRecordCount(backup.recordCount)}.`;
      setBackupStatus({ tone: "success", text });
      showHistoryToast("History exported");
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "History export failed.";
      setBackupStatus({ tone: "error", text });
      showHistoryToast("History export failed");
    }
  };

  const importHistory = async (file: File) => {
    setIsImporting(true);

    try {
      const backup = parseWeightHistoryBackup(await file.text());
      const plan = planWeightHistoryImport(
        await getAllWeights(),
        backup.records,
      );
      const importedCount = await importWeights(plan.recordsToImport);
      const nextWeights = await getAllWeights();
      setWeights(nextWeights);

      const importedText = `Imported ${describeRecordCount(importedCount)}`;
      const skippedText =
        plan.skippedDuplicates > 0
          ? `Skipped ${describeRecordCount(plan.skippedDuplicates)}.`
          : "No duplicates skipped.";
      const text = `${importedText}. ${skippedText}`;
      setBackupStatus({ tone: "success", text });
      showHistoryToast("History imported");
    } catch (error) {
      const text = `Import failed: ${
        error instanceof Error ? error.message : "Unknown backup error."
      }`;
      setBackupStatus({ tone: "error", text });
      showHistoryToast("History import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="history-page">
      <div className="history-actions" aria-label="History backup actions">
        <button
          type="button"
          className="secondary-action history-actions__button"
          onClick={exportHistory}
          disabled={weights.length === 0 || isImporting}
        >
          <Download size={18} strokeWidth={2.25} aria-hidden="true" />
          <span>Export</span>
        </button>
        <button
          type="button"
          className="primary-action history-actions__button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
        >
          <Upload size={18} strokeWidth={2.25} aria-hidden="true" />
          <span>{isImporting ? "Importing" : "Import"}</span>
        </button>
        <input
          ref={fileInputRef}
          className="history-actions__file"
          type="file"
          accept="application/json,.json"
          aria-label="Import history backup"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (file) {
              void importHistory(file);
            }
          }}
        />
      </div>
      {backupStatus ? (
        <p
          className={`history-actions__status history-actions__status--${backupStatus.tone}`}
          role="status"
        >
          {backupStatus.text}
        </p>
      ) : null}

      <label className="search-container" htmlFor="searchBar">
        <Search className="search-icon" size={18} strokeWidth={2.25} />
        <input
          type="search"
          id="searchBar"
          placeholder="Search exercises..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </label>

      <div id="historyAccordion">
        {groupIds.length === 0 ? (
          <div className="empty-state">
            <TrendingUp size={28} strokeWidth={2} aria-hidden="true" />
            <h3>No history yet</h3>
            <p>Log a weight during a workout to see your progress here.</p>
          </div>
        ) : (
          groupIds.map((id) => {
            const entries = groupedWeights[id];
            const isOpen = openIds.has(id);

            return (
              <section className="accordion-item" key={id}>
                <button
                  type="button"
                  className="accordion-header"
                  aria-expanded={isOpen}
                  aria-controls={`collapse-${id}`}
                  onClick={() => toggleId(id)}
                >
                  <span className="header-content">
                    <span className="exercise-name">
                      {exerciseMap[id] || id}
                    </span>
                    <span className="entry-count">
                      {entries.length}{" "}
                      {entries.length === 1 ? "entry" : "entries"}
                    </span>
                  </span>
                  <ChevronDown
                    className={`chevron ${isOpen ? "rotated" : ""}`}
                    size={18}
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={`collapse-${id}`}
                  className={`accordion-content ${isOpen ? "open" : ""}`}
                >
                  <div className="accordion-content__inner">
                    <div className="accordion-body">
                      {entries.map((weight, index) => (
                        <div
                          className={`weight-entry ${index === 0 ? "latest" : ""}`}
                          key={`${weight.id}-${String(weight.date)}-${index}`}
                        >
                          <div className="weight-entry__value">
                            <span className="weight-number">
                              {weight.weight}
                            </span>
                            {index === 0 ? (
                              <span className="latest-badge">Latest</span>
                            ) : null}
                          </div>
                          <div className="weight-date">
                            {new Date(weight.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
