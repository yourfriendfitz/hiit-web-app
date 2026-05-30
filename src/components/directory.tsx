import { CalendarDays, ChevronRight } from "lucide-react";

import { PROGRAM_START_DATE, type WorkoutProgram } from "../types";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function Directory({ program }: { program: WorkoutProgram }) {
  return (
    <div className="directory-list">
      {program.map((week, weekIndex) => {
        const weekStartDate = new Date(PROGRAM_START_DATE);
        weekStartDate.setDate(PROGRAM_START_DATE.getDate() + weekIndex * 7);

        return (
          <section className="directory-week" key={weekIndex}>
            <header className="directory-week__header">
              <CalendarDays size={18} strokeWidth={2.25} aria-hidden="true" />
              <div>
                <h2>Week {weekIndex + 1}</h2>
                <p>{formatDate(weekStartDate)}</p>
              </div>
            </header>
            <div className="directory-week__days">
              {week.map((workout, dayIndex) => {
                const workoutDate = new Date(weekStartDate);
                workoutDate.setDate(weekStartDate.getDate() + dayIndex);

                return (
                  <a
                    className="directory-day"
                    href={`#/workout?week=${weekIndex}&day=${dayIndex}`}
                    key={`${weekIndex}-${dayIndex}`}
                  >
                    <span className="directory-day__date">
                      <span>{dayNames[dayIndex] || "Day"}</span>
                      <strong>{workoutDate.getDate()}</strong>
                    </span>
                    <span className="directory-day__summary">
                      <strong>{workout.name}</strong>
                      <span>{workout.exercises.length} exercises</span>
                    </span>
                    <ChevronRight
                      className="directory-day__chevron"
                      size={18}
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  </a>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
