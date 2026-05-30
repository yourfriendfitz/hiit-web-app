import { BookOpenText, History, Moon, SearchX } from "lucide-react";

export function Loader() {
  return (
    <div id="loaderContainer" className="loader-container">
      <div id="loader" className="loader">
        <span className="loader__spinner" />
        <span className="loader__label">Loading training plan</span>
      </div>
    </div>
  );
}

export function RestDay() {
  return (
    <section className="state-panel">
      <div className="state-panel__icon">
        <Moon size={24} strokeWidth={2} aria-hidden="true" />
      </div>
      <h2>Rest day</h2>
      <p>
        No workout is scheduled today. Browse the directory or review your
        history.
      </p>
      <div className="state-panel__actions">
        <a className="secondary-action" href="#/directory">
          <BookOpenText size={18} strokeWidth={2.25} aria-hidden="true" />
          <span>Browse workouts</span>
        </a>
        <a className="secondary-action" href="#/history">
          <History size={18} strokeWidth={2.25} aria-hidden="true" />
          <span>View history</span>
        </a>
      </div>
    </section>
  );
}

export function NotFound() {
  return (
    <section className="state-panel">
      <div className="state-panel__icon">
        <SearchX size={24} strokeWidth={2} aria-hidden="true" />
      </div>
      <h2>Page not found</h2>
      <p>The requested view does not exist.</p>
      <a className="primary-action state-panel__primary" href="#/">
        Go home
      </a>
    </section>
  );
}
