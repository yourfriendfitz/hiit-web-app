import { CalendarDays, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  PROGRAM_CYCLE_LENGTH_WEEKS,
  getProgramCyclePosition,
} from "../program-schedule";
import { PROGRAM_START_DATE, type WorkoutProgram } from "../types";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getWeekStartDate(weekIndex: number) {
  const weekStartDate = new Date(PROGRAM_START_DATE);
  weekStartDate.setDate(PROGRAM_START_DATE.getDate() + weekIndex * 7);
  return weekStartDate;
}

type DirectoryProps = {
  currentWeek: number | null;
  program: WorkoutProgram;
};

export function Directory({ currentWeek, program }: DirectoryProps) {
  const currentWeekSection = useRef<HTMLDetailsElement | null>(null);
  const positionedCurrentWeek = useRef(false);

  useEffect(() => {
    if (positionedCurrentWeek.current || currentWeek === null) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const section = currentWeekSection.current;

      if (!section) {
        return;
      }

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      section.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
      positionedCurrentWeek.current = true;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentWeek]);

  return (
    <div className="directory-list">
      {Array.from({
        length: Math.ceil(program.length / PROGRAM_CYCLE_LENGTH_WEEKS),
      }).map((_, cycleIndex) => {
        const cycleStartWeekIndex = cycleIndex * PROGRAM_CYCLE_LENGTH_WEEKS;
        const cycleWeeks = program.slice(
          cycleStartWeekIndex,
          cycleStartWeekIndex + PROGRAM_CYCLE_LENGTH_WEEKS,
        );
        const cyclePosition = getProgramCyclePosition(
          cycleStartWeekIndex,
          program.length,
        );
        const cycleStartDate = getWeekStartDate(cycleStartWeekIndex);
        const cycleEndDate = getWeekStartDate(
          cycleStartWeekIndex + cycleWeeks.length - 1,
        );
        cycleEndDate.setDate(cycleEndDate.getDate() + 6);
        const isCurrentCycle =
          currentWeek !== null &&
          currentWeek >= cycleStartWeekIndex &&
          currentWeek < cycleStartWeekIndex + cycleWeeks.length;

        return (
          <details
            className="directory-cycle"
            data-current-cycle={isCurrentCycle ? "true" : undefined}
            data-cycle-index={cycleIndex}
            key={cycleIndex}
            open={isCurrentCycle}
          >
            <summary className="directory-cycle__header">
              <CalendarDays size={18} strokeWidth={2.25} aria-hidden="true" />
              <div>
                <div className="directory-cycle__title">
                  <h2>
                    Cycle {cyclePosition.cycle} of {cyclePosition.totalCycles}
                  </h2>
                  {isCurrentCycle ? (
                    <span className="directory-week__current">Current</span>
                  ) : null}
                </div>
                <p>
                  Program Weeks {cycleStartWeekIndex + 1}-
                  {cycleStartWeekIndex + cycleWeeks.length} •{" "}
                  {formatDate(cycleStartDate)} - {formatDate(cycleEndDate)}
                </p>
              </div>
              <ChevronDown
                className="directory-cycle__chevron"
                size={18}
                strokeWidth={2.25}
                aria-hidden="true"
              />
            </summary>
            <div className="directory-cycle__weeks">
              {cycleWeeks.map((week, cycleWeekOffset) => {
                const weekIndex = cycleStartWeekIndex + cycleWeekOffset;
                const weekStartDate = getWeekStartDate(weekIndex);
                const isCurrentWeek = weekIndex === currentWeek;
                const weekCyclePosition = getProgramCyclePosition(
                  weekIndex,
                  program.length,
                );

                return (
                  <details
                    className="directory-week"
                    data-current-week={isCurrentWeek ? "true" : undefined}
                    data-week-index={weekIndex}
                    key={weekIndex}
                    open={isCurrentWeek}
                    ref={isCurrentWeek ? currentWeekSection : undefined}
                  >
                    <summary className="directory-week__header">
                      <div>
                        <div className="directory-week__title">
                          <h3>Program Week {weekIndex + 1}</h3>
                          <span className="directory-week__cycle">
                            Cycle Week {weekCyclePosition.cycleWeek}/
                            {weekCyclePosition.cycleLength}
                          </span>
                          {isCurrentWeek ? (
                            <span className="directory-week__current">
                              Current
                            </span>
                          ) : null}
                        </div>
                        <p>{formatDate(weekStartDate)}</p>
                      </div>
                      <ChevronDown
                        className="directory-week__chevron"
                        size={18}
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                    </summary>
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
                  </details>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
