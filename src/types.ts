export const APP_VERSION = "3.0.4";
export const DB_NAME = "hiit-app-db";
export const WEIGHT_STORE = "Weights";
export const PROD_HOSTNAME = "yourfriendfitz.github.io";
export const PROGRAM_START_DATE = new Date("2025-07-28T00:00:00-05:00");

export type ExerciseProgramming = {
  name?: string;
  id: string;
  warmupSets: number;
  workingSets: number;
  repsOrDuration: string | number;
  rpeOrPercent: string | number;
  rest: string;
  notes: string;
  lastSetTech?: string;
  earlyRpe?: string | number;
  lastRpe?: string | number;
};

export type Workout = {
  name: string;
  exercises: ExerciseProgramming[];
};

export type WorkoutProgram = Workout[][];

export type ExerciseMetadata = {
  id: string;
  name: string;
  link?: string;
  subs?: string;
};

export type WeightRecord = {
  id: string;
  weight: string;
  date: Date | string;
};

export type Route =
  | { name: "home"; path: "/" }
  | { name: "directory"; path: "/directory" }
  | { name: "history"; path: "/history" }
  | { name: "workout"; path: "/workout"; week: number; day: number }
  | { name: "not-found"; path: string };
