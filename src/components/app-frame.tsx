import {
  BookOpenText,
  Dumbbell,
  History,
  Home,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { APP_VERSION, type Route } from "../types";

type AppFrameProps = {
  children: ReactNode;
  route: Route;
  subtitle?: string;
  title: string;
};

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  isActive: (route: Route) => boolean;
  label: string;
};

const navigationItems: NavigationItem[] = [
  {
    href: "#/",
    icon: Home,
    isActive: (route) => route.name === "home",
    label: "Home",
  },
  {
    href: "#/directory",
    icon: BookOpenText,
    isActive: (route) => route.name === "directory",
    label: "Directory",
  },
  {
    href: "#/history",
    icon: History,
    isActive: (route) => route.name === "history",
    label: "History",
  },
];

function RouteHeader({
  subtitle,
  title,
}: Pick<AppFrameProps, "subtitle" | "title">) {
  return (
    <header className="route-header">
      <div className="route-header__mark" aria-hidden="true">
        <Dumbbell size={18} strokeWidth={2.25} />
      </div>
      <div className="route-header__content">
        <p className="route-header__eyebrow">Training log</p>
        <h1>{title}</h1>
        {subtitle ? <p className="route-header__subtitle">{subtitle}</p> : null}
      </div>
    </header>
  );
}

function BottomNavigation({ route }: Pick<AppFrameProps, "route">) {
  return (
    <nav
      className="bottom-nav"
      aria-label="Primary navigation"
      data-testid="bottom-navigation"
    >
      <div className="bottom-nav__content">
        {navigationItems.map(({ href, icon: Icon, isActive, label }) => {
          const active = isActive(route);

          return (
            <a
              className={`bottom-nav__item ${active ? "is-active" : ""}`}
              href={href}
              aria-current={active ? "page" : undefined}
              key={label}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export function AppFrame({ children, route, subtitle, title }: AppFrameProps) {
  return (
    <div className="app-shell">
      <div className="app-shell__content">
        <RouteHeader title={title} subtitle={subtitle} />
        <main id="appContent" className="app-content">
          {children}
        </main>
        <footer className="app-footer">
          <span id="versionIndicator">v{APP_VERSION}</span>
        </footer>
      </div>
      <BottomNavigation route={route} />
    </div>
  );
}
