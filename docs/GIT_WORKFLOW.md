# Git Workflow and Release Plan

This guide explains how to capture the Week 2 local snapshot and the Week 3 cloud upgrade using branches, folders, and tags so reviewers can compare both builds.

## Branch Strategy

- `main`: holds approved deliverables.
- `cloud-migration`: feature branch for the Week 3 upgrade (already pushed).
- `local-version`: optional helper branch if you need to keep iterating on FastAPI code without touching the cloud build.

## Folder Ownership

| Folder | Purpose | Branch Tip |
| --- | --- | --- |
| `/local-version` | Week 2 FastAPI + Ollama + ChromaDB snapshot | Tag commit as `v1.0-local` once validated |
| `/` (root) | Week 3 Next.js + Upstash + Groq production build | Tag commit as `v2.0-cloud` before merging |

## Step-by-Step Checklist

1. **Capture Local Snapshot**
   ```bash
   git checkout cloud-migration
   git add local-version
   git commit -m "chore: add week2 local snapshot"
   git tag v1.0-local
   git push origin cloud-migration --tags
   ```
2. **Verify Cloud Build**
   - Run `pnpm upsert-data`, `pnpm test-queries`, and `pnpm dev`.
   - Confirm docs under `docs/` are up to date.
3. **Create Cloud Release Tag**
   ```bash
   git commit --allow-empty -m "chore: document cloud release"   # if no changes pending
   git tag v2.0-cloud
   git push origin cloud-migration --tags
   ```
4. **Open Pull Request**
   - Base: `main`
   - Head: `cloud-migration`
   - Describe testing evidence, link to Vercel deploy, and attach screenshots/video.
5. **Post-Merge Hygiene**
   - `git checkout main && git pull`
   - `git merge --ff-only cloud-migration`
   - `git push origin main`
   - Decide whether to delete `cloud-migration` or keep for reference.

## Evidence to Capture

- Screenshot of the FastAPI `/docs` page and a sample `/query` response.
- Screenshot or Loom of the Next.js chat interface answering one of the automated prompts.
- Copy of the latest `docs/test-results` JSON + markdown artifacts (kept locally but referenced in PR).

## Reviewer Tips

- Point reviewers to `local-version/README.md` for Week 2 setup and `README.md` for Week 3.
- Reference tags `v1.0-local` and `v2.0-cloud` to compare diffs between releases.
- Mention retry logic, dataset expansion, and documentation suite as part of the PR summary.
