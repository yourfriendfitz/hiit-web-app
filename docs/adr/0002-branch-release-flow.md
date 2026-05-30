# ADR 0002: Branch And Release Flow

Status: Accepted

Date: 2026-05-29T15:51:43-05:00

## Decision

Use `main` as the long-term production branch and GitHub Pages deployment source. Use short-lived feature branches, pull requests, required CI checks, squash merges for feature work, and GitHub Releases for milestone releases.

Do not change the remote default branch or production deployment source until the GitHub Pages workflow is implemented and verified.

Milestone 4 adds the reviewed workflow path. The remote publishing source must still be switched explicitly to GitHub Actions after merge, then verified before the remote default branch changes.

## Context

The remote repository currently uses `staging` as the default branch. The refactor target is a single live GitHub Pages environment plus local development. Glitch is no longer used.

## Options Considered

- Keep `staging` as the default branch.
- Use `main` as production and add a separate staging environment.
- Use `main` as production with short-lived branches and local validation.

## Rationale

The app has a small user base, one production environment, and no need for a permanent staging deployment. A simple `main` production flow reduces branch confusion. Pull requests and CI provide the needed safety gates.

## Consequences

- The repository default branch should eventually move from `staging` to `main`.
- The branch transition must be planned to avoid disrupting GitHub Pages deployment.
- Milestone releases should be tagged and published through GitHub Releases.
- Existing `staging` can be retired after deployment is stable.
