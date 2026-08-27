# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top
- Comments append under a `## Comments` heading

## Publishing

When a skill says “publish to the issue tracker,” create a file under `.scratch/<feature-slug>/`.

## Fetching

Read the referenced issue file directly.

## Wayfinding

- Map: `.scratch/<effort>/map.md`
- Tickets: `.scratch/<effort>/issues/<NN>-<slug>.md`
- Blocking edges use a `Blocked by:` line
- Claim work by changing its status to `claimed`
- Resolve work by appending `## Answer` and changing its status to `resolved`
