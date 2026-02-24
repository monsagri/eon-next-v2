# AI Completion Checklist

Use this before opening or finalizing a PR.

## Change Integrity

- [ ] Change scope is clear and limited to the intended behavior.
- [ ] No sensitive auth values are logged or exposed.
- [ ] Entity `unique_id` stability is preserved, or migration impact is documented.
- [ ] Auth failures still trigger Home Assistant re-auth behavior correctly.

## Validation

- [ ] `python -m compileall custom_components/eon_next` passes.
- [ ] `basedpyright -p pyrightconfig.json` passes.
- [ ] Commit/PR title follows Conventional Commit format.
- [ ] Relevant manual HA flow checks were run for behavior changes.

## Metadata and Release Hygiene

- [ ] `manifest.json` and `hacs.json` remain valid and consistent.
- [ ] `manifest.json` version matches latest `CHANGELOG.md` version (and `.release-please-manifest.json` when present).
- [ ] `CHANGELOG.md` is updated for user-visible changes.
- [ ] Release/tag requirements are captured for versioned changes.
- [ ] If releasing, `release-please` draft PR has been reviewed before merge.

## Documentation

- [ ] `README.md` is updated for user-visible behavior changes.
- [ ] `CHANGELOG.md` is updated for user-visible behavior changes.
- [ ] `DEVELOPMENT.md` reflects maintainer workflow/config reality.
- [ ] `AGENTS.md`/`docs/ai/*` updated if project conventions changed.
