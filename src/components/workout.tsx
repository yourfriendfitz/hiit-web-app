import {
  Check,
  ChevronDown,
  CircleMinus,
  CirclePlay,
  Save,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Toastify from "toastify-js";

import {
  getWeightForContext,
  storeWeight,
  type WeightLookupResult,
} from "../storage";
import { getWeightRecordContext } from "../program-schedule";
import type {
  ExerciseMetadata,
  ExerciseProgramming,
  WeightRecordContext,
  Workout,
  WorkoutLogContext,
} from "../types";
import { pwaUpdatePolicy } from "../update-policy";

function extractYouTubeVideoId(url: string) {
  const match = url.match(
    /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be\.com\/(?:watch\?v=|embed\/|v\/|.+\?v=))([^&\n?#]+)(?:.*[?&]t=(\d+))?/,
  );

  return {
    videoId: match ? match[1] : null,
    timestamp: match && match[2] ? Number.parseInt(match[2], 10) : 0,
  };
}

function showSavedToast() {
  Toastify({
    text: "Weight saved",
    duration: 2500,
    gravity: "bottom",
    position: "center",
    stopOnFocus: true,
    className: "toastify",
  }).showToast();
}

function showSaveFailedToast() {
  Toastify({
    text: "Weight save failed",
    duration: 2500,
    gravity: "bottom",
    position: "center",
    stopOnFocus: true,
    className: "toastify",
  }).showToast();
}

const emptyWeightLookupResult: WeightLookupResult = {
  record: null,
  source: "none",
  weight: "",
};

function useLastWeight(
  exerciseId: string,
  context: WeightRecordContext,
): WeightLookupResult {
  const [lookupResult, setLookupResult] = useState<WeightLookupResult>(
    emptyWeightLookupResult,
  );
  const requestSequence = useRef(0);
  const { cycle, cycleLength, cycleWeek, programWeek, workoutDay } = context;

  useEffect(() => {
    let active = true;
    const update = () => {
      const sequence = ++requestSequence.current;
      void getWeightForContext(exerciseId, {
        programWeek,
        cycle,
        cycleWeek,
        cycleLength,
        workoutDay,
      })
        .then((latestWeight) => {
          if (active && sequence === requestSequence.current) {
            setLookupResult(latestWeight);
          }
        })
        .catch(() => undefined);
    };

    update();
    window.addEventListener("dbUpdated", update);

    return () => {
      active = false;
      requestSequence.current += 1;
      window.removeEventListener("dbUpdated", update);
    };
  }, [cycle, cycleLength, cycleWeek, exerciseId, programWeek, workoutDay]);

  return lookupResult;
}

function getLastWeightSourceLabel(
  lookupResult: WeightLookupResult,
  context: WeightRecordContext,
) {
  if (lookupResult.source === "cycle-context") {
    return `Last from Cycle Week ${lookupResult.record?.cycleWeek ?? context.cycleWeek}/${lookupResult.record?.cycleLength ?? context.cycleLength} • Day ${lookupResult.record?.workoutDay ?? context.workoutDay}`;
  }

  if (lookupResult.source === "exercise-fallback") {
    return "Last logged for exercise";
  }

  return "No previous";
}

function LastWeight({
  sourceLabel,
  variant = "compact",
  weight,
}: {
  sourceLabel: string;
  variant?: "compact" | "full";
  weight: string;
}) {
  const hasWeight = weight !== "";
  const accessibleLabel = hasWeight ? `${sourceLabel}: ${weight}` : sourceLabel;

  return (
    <span
      className={`weight-badge weight-badge--${variant} ${hasWeight ? "" : "empty"}`}
      title={accessibleLabel}
      aria-label={accessibleLabel}
    >
      {hasWeight ? (
        <TrendingUp size={14} strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <CircleMinus size={14} strokeWidth={2.25} aria-hidden="true" />
      )}
      <span className="weight-value">{hasWeight ? weight : "No previous"}</span>
    </span>
  );
}

function Metric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "accent" | "primary";
  value: number | string;
}) {
  return (
    <div className={`metric ${tone ? `metric--${tone}` : ""}`}>
      <p className="metric__label">{label}</p>
      <p className="metric__value">{value}</p>
    </div>
  );
}

function WeightLogger({
  exercise,
  exerciseInstanceId,
  latestWeight,
  latestWeightSourceLabel,
  weightRecordContext,
}: {
  exercise: ExerciseProgramming;
  exerciseInstanceId: string;
  latestWeight: string;
  latestWeightSourceLabel: string;
  weightRecordContext: WeightRecordContext;
}) {
  const [weight, setWeight] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const weightInputId = `weight-${exerciseInstanceId}`;

  useEffect(
    () => () => pwaUpdatePolicy.clearInput(weightInputId),
    [weightInputId],
  );

  const saveWeight = async () => {
    if (!weight || isSaving) {
      return;
    }

    const earlyRpe = exercise.earlyRpe ?? "N/A";
    const lastRpe = exercise.lastRpe ?? "N/A";
    const weightWithDetails = `${weight} [Sets: ${exercise.workingSets}, Reps: ${exercise.repsOrDuration}, Early RPE: ${earlyRpe}, Last RPE: ${lastRpe}]`;
    setIsSaving(true);
    setSaveError("");

    try {
      await storeWeight(exercise.id, weightWithDetails, weightRecordContext);
      showSavedToast();
      setWeight("");
      pwaUpdatePolicy.clearInput(weightInputId);
      setSaveError("");
    } catch {
      setSaveError("Weight was not saved. Try again.");
      pwaUpdatePolicy.setInputDirty(weightInputId, true);
      showSaveFailedToast();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      className="weight-logger"
      aria-labelledby={`log-weight-${exerciseInstanceId}`}
    >
      <div className="section-heading">
        <p className="section-heading__eyebrow">Training log</p>
        <h3 id={`log-weight-${exerciseInstanceId}`}>Log weight</h3>
      </div>
      <div className="weight-logger__latest">
        <p className="detail-section__label">{latestWeightSourceLabel}</p>
        <LastWeight
          sourceLabel={latestWeightSourceLabel}
          variant="full"
          weight={latestWeight}
        />
      </div>
      <div className="weight-logger__controls">
        <input
          type="text"
          inputMode="text"
          id={weightInputId}
          placeholder="Enter weight or notes, e.g. 40s; RPE 9*"
          value={weight}
          onChange={(event) => {
            const nextWeight = event.target.value;
            setWeight(nextWeight);
            pwaUpdatePolicy.setInputDirty(weightInputId, nextWeight !== "");
          }}
        />
        <button
          type="button"
          className="primary-action"
          onClick={saveWeight}
          disabled={isSaving}
        >
          <Save size={18} strokeWidth={2.5} aria-hidden="true" />
          <span>Save</span>
        </button>
      </div>
      {saveError ? (
        <p className="weight-logger__error" role="status">
          {saveError}
        </p>
      ) : null}
    </section>
  );
}

function ExerciseDetails({
  exercise,
  exerciseDetails,
  exerciseInstanceId,
  latestWeight,
  latestWeightSourceLabel,
  weightRecordContext,
}: {
  exercise: ExerciseProgramming;
  exerciseDetails?: ExerciseMetadata;
  exerciseInstanceId: string;
  latestWeight: string;
  latestWeightSourceLabel: string;
  weightRecordContext: WeightRecordContext;
}) {
  const { videoId, timestamp } = extractYouTubeVideoId(
    exerciseDetails?.link || "",
  );
  const numberOfSets = Number.parseInt(String(exercise.workingSets), 10);

  return (
    <div className="exercise-card__details">
      <div className="metric-grid">
        <Metric label="Warmup" value={exercise.warmupSets} />
        <Metric label="Working sets" value={exercise.workingSets} />
        <Metric label="Reps / duration" value={exercise.repsOrDuration} />
        <Metric label="Rest" value={exercise.rest} />
        <Metric
          label="Early RPE"
          value={exercise.earlyRpe ?? "N/A"}
          tone="accent"
        />
        <Metric
          label="Last RPE"
          value={exercise.lastRpe ?? "N/A"}
          tone="primary"
        />
      </div>

      {exercise.lastSetTech && exercise.lastSetTech !== "N/A" ? (
        <section className="detail-section detail-section--warning">
          <p className="detail-section__label">Last-set technique</p>
          <p>{exercise.lastSetTech}</p>
        </section>
      ) : null}

      {exercise.notes ? (
        <section className="detail-section">
          <p className="detail-section__label">Notes</p>
          <p>{exercise.notes}</p>
        </section>
      ) : null}

      {exerciseDetails?.subs ? (
        <section className="detail-section">
          <p className="detail-section__label">Substitutions</p>
          <p>{exerciseDetails.subs}</p>
        </section>
      ) : null}

      {videoId ? (
        <details className="video-disclosure">
          <summary>
            <CirclePlay size={18} strokeWidth={2.25} aria-hidden="true" />
            <span>Watch exercise demo</span>
          </summary>
          <div className="video-container">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?start=${timestamp}`}
              title={exerciseDetails?.name || exercise.id}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              loading="lazy"
            />
          </div>
        </details>
      ) : null}

      <section className="set-tracker">
        <div className="section-heading">
          <p className="section-heading__eyebrow">Session</p>
          <h3>Track sets</h3>
        </div>
        <div className="set-tracker__grid">
          {Array.from({
            length: Number.isNaN(numberOfSets) ? 0 : numberOfSets,
          }).map((_, setIndex) => (
            <label className="set-row" key={setIndex}>
              <input type="checkbox" />
              <span>Set {setIndex + 1}</span>
              <Check size={16} strokeWidth={2.5} aria-hidden="true" />
            </label>
          ))}
        </div>
      </section>

      <WeightLogger
        exercise={exercise}
        exerciseInstanceId={exerciseInstanceId}
        latestWeight={latestWeight}
        latestWeightSourceLabel={latestWeightSourceLabel}
        weightRecordContext={weightRecordContext}
      />
    </div>
  );
}

function ExerciseCard({
  exercise,
  exerciseDetails,
  instanceId,
  index,
  workoutContext,
}: {
  exercise: ExerciseProgramming;
  exerciseDetails?: ExerciseMetadata;
  instanceId: string;
  index: number;
  workoutContext: WorkoutLogContext;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const exerciseInstanceId = `${instanceId}-${exercise.id}-${index}`;
  const exerciseName =
    exerciseDetails?.name || exercise.name || "Unnamed exercise";
  const weightRecordContext = getWeightRecordContext(workoutContext);
  const latestWeight = useLastWeight(exercise.id, weightRecordContext);
  const latestWeightSourceLabel = getLastWeightSourceLabel(
    latestWeight,
    weightRecordContext,
  );

  return (
    <section
      className={`exercise-card ${isOpen ? "is-open" : ""}`}
      data-exercise-id={exercise.id}
    >
      <button
        type="button"
        className="exercise-card__toggle"
        aria-expanded={isOpen}
        aria-controls={`content-${exerciseInstanceId}`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="exercise-card__number">{index + 1}</span>
        <span className="exercise-card__summary">
          <span className="exercise-card__name">{exerciseName}</span>
          <span className="exercise-card__programming">
            {exercise.workingSets} working sets
            <span aria-hidden="true"> / </span>
            {exercise.repsOrDuration} reps
          </span>
        </span>
        <span className="exercise-card__status">
          <LastWeight
            sourceLabel={latestWeightSourceLabel}
            weight={latestWeight.weight}
          />
          <ChevronDown
            className="exercise-card__chevron"
            size={18}
            strokeWidth={2.25}
            aria-hidden="true"
          />
        </span>
      </button>

      <div
        id={`content-${exerciseInstanceId}`}
        className={`accordion-content ${isOpen ? "open" : ""}`}
      >
        <div className="accordion-content__inner">
          <ExerciseDetails
            exercise={exercise}
            exerciseDetails={exerciseDetails}
            exerciseInstanceId={exerciseInstanceId}
            latestWeight={latestWeight.weight}
            latestWeightSourceLabel={latestWeightSourceLabel}
            weightRecordContext={weightRecordContext}
          />
        </div>
      </div>
    </section>
  );
}

export function WorkoutView({
  exerciseMap,
  instanceId,
  workout,
  workoutContext,
}: {
  exerciseMap: Record<string, ExerciseMetadata>;
  instanceId: string;
  workout: Workout;
  workoutContext: WorkoutLogContext;
}) {
  return (
    <div id={`workout-${instanceId}`} className="workout-list">
      {workout.exercises.map((exercise, index) => (
        <ExerciseCard
          key={`${instanceId}-${exercise.id}-${index}`}
          exercise={exercise}
          exerciseDetails={exerciseMap[exercise.id]}
          instanceId={instanceId}
          index={index}
          workoutContext={workoutContext}
        />
      ))}
    </div>
  );
}
