import { CalendarPlus, ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";

import {
  formatWorkoutScheduleLabel,
  type RecentProgramWorkout,
} from "../program-schedule";
import type { ExerciseMetadata, Workout } from "../types";
import { WorkoutView } from "./workout";

function formatWorkoutDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function WorkoutSection({
  exerciseMap,
  instanceId,
  label,
  meta,
  onRemove,
  workout,
}: {
  exerciseMap: Record<string, ExerciseMetadata>;
  instanceId: string;
  label: string;
  meta: string;
  onRemove?: () => void;
  workout: Workout;
}) {
  return (
    <section
      className="workout-section"
      data-testid="workout-section"
      data-workout-instance={instanceId}
    >
      <header className="workout-section__header">
        <div>
          <p className="section-heading__eyebrow">{label}</p>
          <h2>{workout.name}</h2>
          <p className="workout-section__meta">{meta}</p>
        </div>
        {onRemove ? (
          <button
            type="button"
            className="secondary-action workout-section__remove"
            onClick={onRemove}
            aria-label={`Remove ${workout.name}`}
          >
            <X size={17} strokeWidth={2.5} aria-hidden="true" />
            <span>Remove</span>
          </button>
        ) : null}
      </header>
      <WorkoutView
        exerciseMap={exerciseMap}
        instanceId={instanceId}
        workout={workout}
      />
    </section>
  );
}

export function HomeWorkout({
  currentWeek,
  exerciseMap,
  programLength,
  recentWorkouts,
  today,
}: {
  currentWeek: number;
  exerciseMap: Record<string, ExerciseMetadata>;
  programLength: number;
  recentWorkouts: RecentProgramWorkout[];
  today: {
    workout: Workout;
    workoutDay: number;
  };
}) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] =
    useState<RecentProgramWorkout | null>(null);

  return (
    <div className="home-workout">
      <WorkoutSection
        exerciseMap={exerciseMap}
        instanceId="today"
        label="Today"
        meta={formatWorkoutScheduleLabel(
          currentWeek,
          today.workoutDay,
          programLength,
        )}
        workout={today.workout}
      />

      {selectedWorkout ? (
        <WorkoutSection
          exerciseMap={exerciseMap}
          instanceId={`missed-${selectedWorkout.key}`}
          label="Added missed workout"
          meta={`${formatWorkoutDate(
            selectedWorkout.date,
          )} • ${formatWorkoutScheduleLabel(
            selectedWorkout.week,
            selectedWorkout.day + 1,
            programLength,
          )}`}
          onRemove={() => setSelectedWorkout(null)}
          workout={selectedWorkout.workout}
        />
      ) : recentWorkouts.length > 0 ? (
        <section className="quick-add" aria-label="Missed workout">
          <button
            type="button"
            className="secondary-action quick-add__toggle"
            aria-expanded={isQuickAddOpen}
            onClick={() => setIsQuickAddOpen((current) => !current)}
          >
            <CalendarPlus size={18} strokeWidth={2.25} aria-hidden="true" />
            <span>Add missed workout</span>
            <ChevronDown
              className={`quick-add__chevron ${
                isQuickAddOpen ? "is-open" : ""
              }`}
              size={18}
              strokeWidth={2.25}
              aria-hidden="true"
            />
          </button>
          {isQuickAddOpen ? (
            <div className="quick-add__options">
              {recentWorkouts.map((recentWorkout) => (
                <button
                  type="button"
                  className="quick-add__option"
                  key={recentWorkout.key}
                  onClick={() => {
                    setSelectedWorkout(recentWorkout);
                    setIsQuickAddOpen(false);
                  }}
                  aria-label={`Add ${formatWorkoutDate(recentWorkout.date)} ${
                    recentWorkout.workout.name
                  }`}
                >
                  <span>
                    <span className="quick-add__date">
                      {formatWorkoutDate(recentWorkout.date)}
                    </span>
                    <strong>{recentWorkout.workout.name}</strong>
                  </span>
                  <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
