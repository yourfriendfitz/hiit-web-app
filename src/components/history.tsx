import { ChevronDown, Search, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getAllWeights } from "../storage";
import type { ExerciseMetadata, WeightRecord } from "../types";

export function HistoryPage({ exercises }: { exercises: ExerciseMetadata[] }) {
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [filter, setFilter] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

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
    const filteredWeights = weights.filter((weight) =>
      exerciseMap[weight.id]?.toLowerCase().includes(filter.toLowerCase()),
    );

    return filteredWeights.reduce<Record<string, WeightRecord[]>>(
      (groups, weight) => {
        groups[weight.id] = groups[weight.id] || [];
        groups[weight.id].push(weight);
        return groups;
      },
      {},
    );
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

  return (
    <div className="history-page">
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
                  <div className="accordion-body">
                    {entries
                      .slice()
                      .reverse()
                      .map((weight, index) => (
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
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
