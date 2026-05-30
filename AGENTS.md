# Repo Instructions

## Container Workflow

- Use containers for dependency installation and project checks by default.
- Use the Playwright base image pinned to the project Playwright version: `mcr.microsoft.com/playwright:v1.60.0-noble`.
- Build the check image with `docker build -t hiit-web-app-checks .`.
- Run all checks with `docker run --rm hiit-web-app-checks`.
- GitHub Pages hosting remains static; the container is only for local and CI tooling.

## Project Commands

- Local Vite app: `npm run serve`
- Production build: `npm run build`
- Production preview: `npm run preview`
- Lint: `npm run lint`
- Format check: `npm run format:check`
- Typecheck: `npm run typecheck`
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`
- Full check: `npm run check`
