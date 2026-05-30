import type { ExerciseMetadata, Workout, WorkoutProgram } from "./types";

const requiredExerciseFields = [
  "id",
  "notes",
  "repsOrDuration",
  "rest",
  "rpeOrPercent",
  "warmupSets",
  "workingSets",
] as const;

const assetPath = (fileName: string) =>
  `${import.meta.env.BASE_URL}${fileName}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isWorkout = (value: unknown): value is Workout => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.name === "string" && Array.isArray(value.exercises);
};

export function validateWorkoutProgram(value: unknown): WorkoutProgram {
  if (!Array.isArray(value)) {
    throw new Error("Workout data must be an array of weeks.");
  }

  for (const week of value) {
    if (!Array.isArray(week)) {
      throw new Error("Each workout week must be an array of workouts.");
    }

    for (const workout of week) {
      if (!isWorkout(workout)) {
        throw new Error("Each workout must include a name and exercises.");
      }

      for (const exercise of workout.exercises) {
        if (!isRecord(exercise)) {
          throw new Error("Each workout exercise must be an object.");
        }

        for (const field of requiredExerciseFields) {
          if (!(field in exercise)) {
            throw new Error(`Workout exercise is missing ${field}.`);
          }
        }
      }
    }
  }

  return value as WorkoutProgram;
}

export function validateExerciseMetadata(value: unknown): ExerciseMetadata[] {
  if (!Array.isArray(value)) {
    throw new Error("Exercise metadata must be an array.");
  }

  for (const exercise of value) {
    if (
      !isRecord(exercise) ||
      typeof exercise.id !== "string" ||
      typeof exercise.name !== "string"
    ) {
      throw new Error(
        "Each exercise metadata record must include id and name.",
      );
    }
  }

  return value as ExerciseMetadata[];
}

export async function loadWorkoutProgram(): Promise<WorkoutProgram> {
  const response = await fetch(assetPath("data.json"));
  if (!response.ok) {
    throw new Error("Failed to load workout data.");
  }

  return validateWorkoutProgram(await response.json());
}

export async function loadExerciseMetadata(): Promise<ExerciseMetadata[]> {
  const response = await fetch(assetPath("exercises.json"));
  if (!response.ok) {
    throw new Error("Failed to load exercise metadata.");
  }

  return validateExerciseMetadata(await response.json());
}

export function mapExercisesById(
  exercises: ExerciseMetadata[],
): Record<string, ExerciseMetadata> {
  return exercises.reduce<Record<string, ExerciseMetadata>>((map, exercise) => {
    map[exercise.id] = exercise;
    return map;
  }, {});
}
