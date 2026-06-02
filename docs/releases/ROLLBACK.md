# Production Rollback

Use this runbook only if the refactor production cutover fails verification.

## Protected Baseline

The pre-refactor production baseline is:

```text
2ef93c0cc5db8b4cad6ced6311434a62bad0e75a
```

The owner-approved immutable tag `pre-refactor-3.0.4` and branch `rollback/pre-refactor-3.0.4` were created from that commit before cutover. Keep `staging` available until a separate cleanup is approved.

## Triggers

Rollback is appropriate when production verification finds a release-blocking issue such as:

- Existing IndexedDB history is not readable.
- New saved weights are not retained after reload.
- Core routes fail to load.
- GitHub Pages Actions deployment fails or serves a broken artifact.
- The installed PWA cannot update or load core content offline after the online first visit.

## Procedure

1. Stop the release before changing the default branch or publishing the release tag.
2. Confirm the failing production behavior and record the evidence.
3. Revert the release-candidate merge on `main` with a normal revert commit, or restore the approved rollback baseline through a reviewed pull request.
4. If the GitHub Actions Pages path is implicated, restore the previous legacy Pages branch publishing source.
5. Verify `https://yourfriendfitz.github.io/hiit-web-app/`.
6. Confirm existing IndexedDB history remains readable.
7. Fix the blocker on a new reviewed branch.

## Safety Rules

- Do not clear IndexedDB.
- Do not ask users to clear site data.
- Do not force-push or rewrite shared history.
- Do not delete remote branches during rollback.
- Do not publish a release tag until production verification succeeds.
- Do not remove the legacy PWA migration bridge during the initial v4 rollout.
