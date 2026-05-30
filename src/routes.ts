import type { Route } from "./types";

export function parseRoute(hash = window.location.hash): Route {
  const path = hash.slice(1) || "/";

  if (path === "/") {
    return { name: "home", path };
  }

  if (path === "/directory") {
    return { name: "directory", path };
  }

  if (path === "/history") {
    return { name: "history", path };
  }

  if (path.startsWith("/workout")) {
    const queryString = path.split("?")[1] || "";
    const params = new URLSearchParams(queryString);
    const week = Number.parseInt(params.get("week") || "", 10);
    const day = Number.parseInt(params.get("day") || "", 10);

    return {
      name: "workout",
      path: "/workout",
      week: Number.isNaN(week) ? 0 : week,
      day: Number.isNaN(day) ? 0 : day,
    };
  }

  return { name: "not-found", path };
}
