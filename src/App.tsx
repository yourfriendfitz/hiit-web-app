import { useEffect, useState, type ReactNode } from "react";

import { AppFrame } from "./components/app-frame";
import { Directory } from "./components/directory";
import { HistoryPage } from "./components/history";
import { Loader, NotFound, RestDay } from "./components/states";
import { WorkoutView } from "./components/workout";
import {
  loadExerciseMetadata,
  loadWorkoutProgram,
  mapExercisesById,
} from "./data";
import { parseRoute } from "./routes";
import {
  PROD_HOSTNAME,
  PROGRAM_START_DATE,
  type ExerciseMetadata,
  type Route,
  type WorkoutProgram,
} from "./types";

type AppData = {
  program: WorkoutProgram;
  exercises: ExerciseMetadata[];
};

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

function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseRoute());

  useEffect(() => {
    const updateRoute = () => setRoute(parseRoute());
    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  return route;
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <section className="state-panel state-panel--error">
      <h2>Unable to load the app</h2>
      <p>{message}</p>
    </section>
  );
}

function App() {
  const route = useRoute();
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [route]);

  useEffect(() => {
    if (
      window.location.hostname !== PROD_HOSTNAME &&
      !document.title.startsWith("(STAGING) ")
    ) {
      document.title = `(STAGING) ${document.title}`;
    }
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
      <AppFrame route={route} title="Error">
        <ErrorPanel message={loadError} />
      </AppFrame>
    );
  }

  if (!data) {
    return (
      <AppFrame route={route} title="Loading">
        <Loader />
      </AppFrame>
    );
  }

  const exerciseMap = mapExercisesById(data.exercises);
  const currentWeek = getCurrentWeek(PROGRAM_START_DATE);
  const today = getWorkoutForToday(data.program, currentWeek);

  let title = "Rest day";
  let subtitle: string | undefined;
  let content: ReactNode = <RestDay />;

  if (route.name === "home") {
    if (today?.workout) {
      title = today.workout.name;
      subtitle = `Week ${currentWeek + 1} / Day ${today.workoutDay}`;
      content = (
        <WorkoutView workout={today.workout} exerciseMap={exerciseMap} />
      );
    }
  } else if (route.name === "directory") {
    title = "Workout directory";
    subtitle = "48-week training plan";
    content = <Directory program={data.program} />;
  } else if (route.name === "history") {
    title = "History";
    subtitle = "Saved working weights";
    content = <HistoryPage exercises={data.exercises} />;
  } else if (route.name === "workout") {
    const workout = data.program[route.week]?.[route.day];
    if (workout) {
      title = workout.name;
      subtitle = `Week ${route.week + 1} / Day ${route.day + 1}`;
      content = <WorkoutView workout={workout} exerciseMap={exerciseMap} />;
    } else {
      title = "Workout not found";
      content = <NotFound />;
    }
  } else {
    title = "Page not found";
    content = <NotFound />;
  }

  return (
    <AppFrame route={route} title={title} subtitle={subtitle}>
      {content}
    </AppFrame>
  );
}

export default App;
