import { useEffect, useMemo, useRef, useState } from "react";

import {
  loadExerciseMetadata,
  loadWorkoutProgram,
  mapExercisesById,
} from "./data";
import { parseRoute } from "./routes";
import { getAllWeights, getWeight, storeWeight } from "./storage";
import {
  APP_VERSION,
  PROD_HOSTNAME,
  PROGRAM_START_DATE,
  type ExerciseMetadata,
  type ExerciseProgramming,
  type Route,
  type WeightRecord,
  type Workout,
  type WorkoutProgram,
} from "./types";

type AppData = {
  program: WorkoutProgram;
  exercises: ExerciseMetadata[];
};

type HeaderProps = {
  route: Route;
  title: string;
  subtitle?: string;
};

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function iconPath(name: "home" | "directory" | "history" | "refresh") {
  switch (name) {
    case "home":
      return "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6";
    case "directory":
      return "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253";
    case "history":
      return "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z";
    case "refresh":
      return "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15";
  }
}

function SvgIcon({
  name,
}: {
  name: "home" | "directory" | "history" | "refresh";
}) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d={iconPath(name)}
      />
    </svg>
  );
}

function Header({ route, title, subtitle }: HeaderProps) {
  const isHome = route.name === "home";
  const isDirectory = route.name === "directory";
  const isHistory = route.name === "history";

  return (
    <header className="header-container">
      <div className="nav-group">
        <a
          href="#/"
          className={`nav-btn ${isHome ? "disabled active" : ""}`}
          aria-disabled={isHome}
          title="Home"
          onClick={(event) => isHome && event.preventDefault()}
        >
          <SvgIcon name="home" />
        </a>
        <button
          id="update-cache"
          className="nav-btn refresh-btn"
          title="Refresh Cache"
          type="button"
          onClick={() => window.location.reload()}
        >
          <SvgIcon name="refresh" />
        </button>
      </div>

      <div className="title-section">
        <div id="header">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>

      <div className="nav-group">
        <a
          href="#/directory"
          className={`nav-btn ${isDirectory ? "disabled active" : ""}`}
          aria-disabled={isDirectory}
          title="Directory"
          onClick={(event) => isDirectory && event.preventDefault()}
        >
          <SvgIcon name="directory" />
        </a>
        <a
          href="#/history"
          className={`nav-btn ${isHistory ? "disabled active" : ""}`}
          aria-disabled={isHistory}
          title="History"
          onClick={(event) => isHistory && event.preventDefault()}
        >
          <SvgIcon name="history" />
        </a>
      </div>
    </header>
  );
}

function Loader() {
  return (
    <div
      id="loaderContainer"
      className="flex flex-col items-center justify-center min-h-[60vh]"
    >
      <div id="loader" className="relative">
        <div className="w-16 h-16 border-4 border-surface-light border-t-primary rounded-full animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">
          P
        </span>
      </div>
    </div>
  );
}

function VersionIndicator() {
  return (
    <div
      id="versionIndicator"
      className="fixed bottom-4 right-4 px-3 py-1.5 bg-surface/80 backdrop-blur-sm text-zinc-400 text-xs font-medium rounded-full border border-zinc-800 hover:border-primary/50 transition-all cursor-default"
    >
      v{APP_VERSION}
    </div>
  );
}

function getCurrentWeek(startDate: Date) {
  const today = new Date();
  const daysSinceStart = Math.floor(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const weeksSinceStart = Math.floor(daysSinceStart / 7);
  return today < startDate ? 0 : weeksSinceStart;
}

function getWorkoutForToday(program: WorkoutProgram, currentWeek: number) {
  const today = new Date();
  const dayIndex = today.getDay();
  const scheduleDay = dayIndex >= 1 && dayIndex <= 5 ? dayIndex : null;

  if (scheduleDay === null || currentWeek >= program.length) {
    return null;
  }

  return {
    workout: program[currentWeek]?.[scheduleDay - 1],
    workoutDay: scheduleDay,
  };
}

function extractYouTubeVideoId(url: string) {
  const match = url.match(
    /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be\.com\/(?:watch\?v=|embed\/|v\/|.+\?v=))([^&\n?#]+)(?:.*[?&]t=(\d+))?/,
  );

  return {
    videoId: match ? match[1] : null,
    timestamp: match && match[2] ? Number.parseInt(match[2], 10) : 0,
  };
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function showSavedToast() {
  window
    .Toastify?.({
      text: "Weight saved!",
      duration: 2500,
      gravity: "bottom",
      position: "center",
      stopOnFocus: true,
      className: "toastify",
    })
    .showToast();
}

function LastWeight({ exerciseId }: { exerciseId: string }) {
  const [weight, setWeight] = useState("");
  const requestSequence = useRef(0);

  useEffect(() => {
    let active = true;
    const update = () => {
      const sequence = ++requestSequence.current;
      void getWeight(exerciseId).then((latestWeight) => {
        if (active && sequence === requestSequence.current) {
          setWeight(latestWeight);
        }
      });
    };

    update();
    window.addEventListener("dbUpdated", update);

    return () => {
      active = false;
      requestSequence.current += 1;
      window.removeEventListener("dbUpdated", update);
    };
  }, [exerciseId]);

  const hasWeight = weight !== "";

  return (
    <span className={`weight-badge ${hasWeight ? "" : "empty"}`}>
      <svg
        className="weight-icon"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d={hasWeight ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M20 12H4"}
        />
      </svg>
      <span className="weight-value">{hasWeight ? weight : "No previous"}</span>
    </span>
  );
}

function ExerciseCard({
  exercise,
  exerciseDetails,
  index,
}: {
  exercise: ExerciseProgramming;
  exerciseDetails?: ExerciseMetadata;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const { videoId, timestamp } = extractYouTubeVideoId(
    exerciseDetails?.link || "",
  );
  const numberOfSets = Number.parseInt(String(exercise.workingSets), 10);

  const saveWeight = async () => {
    if (!weight) {
      return;
    }

    const weightWithDetails = `${weight} [Sets: ${exercise.workingSets}, Reps: ${exercise.repsOrDuration}, Early RPE: ${exercise.earlyRpe}, Last RPE: ${exercise.lastRpe}]`;
    await storeWeight(exercise.id, weightWithDetails);
    showSavedToast();
    setWeight("");
  };

  return (
    <section className="exercise-card mb-4 bg-surface rounded-2xl border border-zinc-800 overflow-hidden card-glow transition-all duration-300 hover:border-primary/30">
      <button
        type="button"
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-surface-light/50 transition-colors group"
        aria-expanded={isOpen}
        aria-controls={`content-${exercise.id}`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
            {index + 1}
          </span>
          <span className="font-semibold text-zinc-100 group-hover:text-primary transition-colors">
            {exerciseDetails?.name || exercise.name || "Unnamed Exercise"}
          </span>
        </span>
        <svg
          className={`w-5 h-5 text-zinc-400 transform transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <div
        id={`content-${exercise.id}`}
        className={`accordion-content ${isOpen ? "open" : ""}`}
      >
        <div className="px-5 pb-5 pt-2 border-t border-zinc-800/50">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Warmup Sets" value={exercise.warmupSets} />
              <Metric label="Working Sets" value={exercise.workingSets} />
              <Metric label="Reps/Duration" value={exercise.repsOrDuration} />
              <Metric label="Rest" value={exercise.rest} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Metric
                label="Early Set RPE"
                value={exercise.earlyRpe || "N/A"}
                tone="accent"
              />
              <Metric
                label="Last Set RPE"
                value={exercise.lastRpe || "N/A"}
                tone="primary"
              />
            </div>

            {exercise.lastSetTech && exercise.lastSetTech !== "N/A" ? (
              <div className="p-3 bg-warning/5 border border-warning/20 rounded-xl">
                <p className="text-xs text-warning uppercase tracking-wide">
                  Last-Set Intensity Technique
                </p>
                <p className="text-sm font-medium text-zinc-100 mt-1">
                  {exercise.lastSetTech}
                </p>
              </div>
            ) : null}

            {exercise.notes ? (
              <div className="p-4 bg-surface-light/30 rounded-xl">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
                  Notes
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {exercise.notes}
                </p>
              </div>
            ) : null}

            {videoId ? (
              <div className="video-container">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?start=${timestamp}`}
                  title={exerciseDetails?.name || exercise.id}
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  loading="lazy"
                />
              </div>
            ) : null}

            {exerciseDetails?.subs ? (
              <div className="p-3 bg-surface-light/30 rounded-xl">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                  Substitutions
                </p>
                <p className="text-sm text-zinc-400">{exerciseDetails.subs}</p>
              </div>
            ) : null}

            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
                Track Your Sets
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Array.from({
                  length: Number.isNaN(numberOfSets) ? 0 : numberOfSets,
                }).map((_, setIndex) => (
                  <label
                    key={setIndex}
                    className="flex items-center gap-3 p-4 bg-surface-light/50 rounded-lg cursor-pointer hover:bg-surface-light transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-zinc-600 text-primary focus:ring-primary focus:ring-offset-0 focus:ring-2"
                    />
                    <span className="text-zinc-300">Set {setIndex + 1}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-100">Log Weight</p>
                <LastWeight exerciseId={exercise.id} />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  id={`weight-${exercise.id}`}
                  placeholder="Enter weight (e.g., 135 lbs)"
                  className="flex-1 px-4 py-4 bg-surface border border-zinc-700 focus:border-primary rounded-xl text-zinc-100 placeholder-zinc-500 transition-colors"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                />
                <button
                  type="button"
                  className="w-full sm:w-auto px-6 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  onClick={saveWeight}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "primary" | "accent";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/5 border border-primary/20"
      : tone === "accent"
        ? "bg-accent/5 border border-accent/20"
        : "bg-surface-light/30";
  const labelClass =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
        ? "text-accent"
        : "text-zinc-500";

  return (
    <div className={`p-3 rounded-xl ${toneClass}`}>
      <p className={`text-xs uppercase tracking-wide ${labelClass}`}>{label}</p>
      <p className="text-lg font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function WorkoutView({
  workout,
  exerciseMap,
}: {
  workout: Workout;
  exerciseMap: Record<string, ExerciseMetadata>;
}) {
  return (
    <div id="workoutList" className="space-y-4">
      {workout.exercises.map((exercise, index) => (
        <ExerciseCard
          key={`${exercise.id}-${index}`}
          exercise={exercise}
          exerciseDetails={exerciseMap[exercise.id]}
          index={index}
        />
      ))}
    </div>
  );
}

function Directory({ program }: { program: WorkoutProgram }) {
  return (
    <>
      {program.map((week, weekIndex) => {
        const weekStartDate = new Date(PROGRAM_START_DATE);
        weekStartDate.setDate(PROGRAM_START_DATE.getDate() + weekIndex * 7);

        return (
          <section className="mb-8" key={weekIndex}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-100">
                  Week {weekIndex + 1}
                </h2>
                <p className="text-sm text-zinc-500">
                  {formatDate(weekStartDate)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {week.map((workout, dayIndex) => {
                const workoutDate = new Date(weekStartDate);
                workoutDate.setDate(weekStartDate.getDate() + dayIndex);

                return (
                  <a
                    key={`${weekIndex}-${dayIndex}`}
                    href={`#/workout?week=${weekIndex}&day=${dayIndex}`}
                    className="group flex items-center gap-4 p-4 bg-surface hover:bg-surface-light border border-zinc-800 hover:border-primary/30 rounded-xl transition-all"
                  >
                    <span className="flex-shrink-0 w-12 h-12 flex flex-col items-center justify-center rounded-lg bg-surface-light group-hover:bg-primary/10 transition-colors">
                      <span className="text-xs font-medium text-zinc-400 group-hover:text-primary">
                        {dayNames[dayIndex] || "Day"}
                      </span>
                      <span className="text-lg font-bold text-zinc-100 group-hover:text-primary">
                        {workoutDate.getDate()}
                      </span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-zinc-100 group-hover:text-primary transition-colors truncate">
                        {workout.name}
                      </span>
                      <span className="block text-sm text-zinc-500">
                        {workout.exercises.length} exercises
                      </span>
                    </span>
                    <svg
                      className="w-5 h-5 text-zinc-600 group-hover:text-primary transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </a>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

function HistoryPage({ exercises }: { exercises: ExerciseMetadata[] }) {
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
    <div>
      <div className="search-container">
        <svg
          className="search-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
          />
        </svg>
        <input
          type="text"
          id="searchBar"
          placeholder="Search exercises..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>

      <div id="historyAccordion">
        {groupIds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">--</div>
            <h3>No History Yet</h3>
            <p>
              Start logging your weights during workouts to see your progress
              here.
            </p>
          </div>
        ) : (
          groupIds.map((id) => {
            const entries = groupedWeights[id];
            const isOpen = openIds.has(id);

            return (
              <div className="accordion-item" key={id}>
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
                  <svg
                    className={`chevron ${isOpen ? "rotated" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
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
                          <div className="weight-value">
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
            );
          })
        )}
      </div>
    </div>
  );
}

function RestDay() {
  return (
    <div className="rest-day-gradient rounded-2xl p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
        <span className="text-2xl font-bold text-accent">R</span>
      </div>
      <h2 className="text-2xl font-bold text-zinc-100 mb-2">Rest Day</h2>
      <p className="text-zinc-400 mb-6">
        No workout scheduled for today. Take it easy and recover!
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="#/directory"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface hover:bg-surface-light text-zinc-100 font-medium rounded-xl transition-colors"
        >
          Browse Workouts
        </a>
        <a
          href="#/history"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded-xl transition-colors"
        >
          View History
        </a>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h1 className="text-2xl font-bold text-zinc-100">Page Not Found</h1>
      <p className="text-zinc-400 mt-2">
        The page you are looking for does not exist.
      </p>
      <a
        href="#/"
        className="mt-6 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors"
      >
        Go Home
      </a>
    </div>
  );
}

function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseRoute());

  useEffect(() => {
    const updateRoute = () => setRoute(parseRoute());
    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  return route;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return () => undefined;
  }

  const register = () => {
    const serviceWorkerUrl = `${import.meta.env.BASE_URL}service-worker.js`;
    navigator.serviceWorker
      .register(serviceWorkerUrl)
      .catch((error: unknown) => {
        console.error("Service Worker registration failed:", error);
      });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }

  return () => window.removeEventListener("load", register);
}

function App() {
  const route = useRoute();
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (
      window.location.hostname !== PROD_HOSTNAME &&
      !document.title.startsWith("(STAGING) ")
    ) {
      document.title = `(STAGING) ${document.title}`;
    }

    return registerServiceWorker();
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([loadWorkoutProgram(), loadExerciseMetadata()])
      .then(([program, exercises]) => {
        if (active) {
          setData({ program, exercises });
        }
      })
      .catch((error: unknown) => {
        console.error(error);
        if (active) {
          setLoadError("Failed to load workout data.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <Header route={route} title="Error" />
        <main className="mt-6">
          <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center">
            <p className="text-danger font-medium">{loadError}</p>
          </div>
        </main>
        <VersionIndicator />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <Loader />
        <VersionIndicator />
      </div>
    );
  }

  const exerciseMap = mapExercisesById(data.exercises);
  const currentWeek = getCurrentWeek(PROGRAM_START_DATE);
  const today = getWorkoutForToday(data.program, currentWeek);

  let title = "Rest Day";
  let subtitle: string | undefined;
  let content: React.ReactNode = <RestDay />;

  if (route.name === "home") {
    if (today?.workout) {
      title = today.workout.name;
      subtitle = `Week ${currentWeek + 1} • Day ${today.workoutDay}`;
      content = (
        <WorkoutView workout={today.workout} exerciseMap={exerciseMap} />
      );
    }
  } else if (route.name === "directory") {
    title = "Workout Directory";
    content = <Directory program={data.program} />;
  } else if (route.name === "history") {
    title = "History";
    content = <HistoryPage exercises={data.exercises} />;
  } else if (route.name === "workout") {
    const workout = data.program[route.week]?.[route.day];
    if (workout) {
      title = workout.name;
      subtitle = `Week ${route.week + 1} • Day ${route.day + 1}`;
      content = <WorkoutView workout={workout} exerciseMap={exerciseMap} />;
    } else {
      title = "Workout Not Found";
      content = (
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center">
          <p className="text-danger font-medium">
            Workout not found for Week {route.week + 1}, Day {route.day + 1}.
          </p>
          <a
            href="#/directory"
            className="inline-block mt-4 px-5 py-2.5 bg-surface hover:bg-surface-light text-zinc-100 font-medium rounded-xl transition-colors"
          >
            Browse Directory
          </a>
        </div>
      );
    }
  } else {
    title = "Page Not Found";
    content = <NotFound />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
      <Header route={route} title={title} subtitle={subtitle} />
      <main id="appContent" className="mt-6">
        {content}
      </main>
      <VersionIndicator />
    </div>
  );
}

export default App;
