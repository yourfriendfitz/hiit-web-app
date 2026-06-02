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

import { getWeight, storeWeight } from "../storage";
import type { ExerciseMetadata, ExerciseProgramming, Workout } from "../types";
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

function useLastWeight(exerciseId: string) {
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

  return weight;
}

function LastWeight({
  variant = "compact",
  weight,
}: {
  variant?: "compact" | "full";
  weight: string;
}) {
  const hasWeight = weight !== "";

  return (
    <span
      className={`weight-badge weight-badge--${variant} ${hasWeight ? "" : "empty"}`}
      title={hasWeight ? `Last logged weight: ${weight}` : "No previous weight"}
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
}: {
  exercise: ExerciseProgramming;
  exerciseInstanceId: string;
  latestWeight: string;
}) {
  const [weight, setWeight] = useState("");
  const weightInputId = `weight-${exerciseInstanceId}`;

  useEffect(
    () => () => pwaUpdatePolicy.clearInput(weightInputId),
    [weightInputId],
  );

  const saveWeight = async () => {
    if (!weight) {
      return;
    }

    const earlyRpe = exercise.earlyRpe ?? "N/A";
    const lastRpe = exercise.lastRpe ?? "N/A";
    const weightWithDetails = `${weight} [Sets: ${exercise.workingSets}, Reps: ${exercise.repsOrDuration}, Early RPE: ${earlyRpe}, Last RPE: ${lastRpe}]`;
    await storeWeight(exercise.id, weightWithDetails);
    showSavedToast();
    setWeight("");
    pwaUpdatePolicy.clearInput(weightInputId);
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
      {latestWeight ? (
        <div className="weight-logger__latest">
          <p className="detail-section__label">Last logged weight</p>
          <LastWeight variant="full" weight={latestWeight} />
        </div>
      ) : null}
      <div className="weight-logger__controls">
        <input
          type="text"
          inputMode="decimal"
          id={weightInputId}
          placeholder="Enter weight, e.g. 135 lbs"
          value={weight}
          onChange={(event) => {
            const nextWeight = event.target.value;
            setWeight(nextWeight);
            pwaUpdatePolicy.setInputDirty(weightInputId, nextWeight !== "");
          }}
        />
        <button type="button" className="primary-action" onClick={saveWeight}>
          <Save size={18} strokeWidth={2.5} aria-hidden="true" />
          <span>Save</span>
        </button>
      </div>
    </section>
  );
}

function ExerciseDetails({
  exercise,
  exerciseDetails,
  exerciseInstanceId,
  latestWeight,
}: {
  exercise: ExerciseProgramming;
  exerciseDetails?: ExerciseMetadata;
  exerciseInstanceId: string;
  latestWeight: string;
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
      />
    </div>
  );
}

function ExerciseCard({
  exercise,
  exerciseDetails,
  instanceId,
  index,
}: {
  exercise: ExerciseProgramming;
  exerciseDetails?: ExerciseMetadata;
  instanceId: string;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const exerciseInstanceId = `${instanceId}-${exercise.id}-${index}`;
  const exerciseName =
    exerciseDetails?.name || exercise.name || "Unnamed exercise";
  const latestWeight = useLastWeight(exercise.id);

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
          <LastWeight weight={latestWeight} />
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
            latestWeight={latestWeight}
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
}: {
  exerciseMap: Record<string, ExerciseMetadata>;
  instanceId: string;
  workout: Workout;
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
        />
      ))}
    </div>
  );
}
