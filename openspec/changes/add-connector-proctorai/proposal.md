# Proposal: add-connector-proctorai

## Why

Nothing in the catalog grades student work yet. Proctor AI (proctorai.io)
marks handwritten exam answer sheets against a teacher's marking key. An
agent built for teachers, tutoring or a school ERP that needs to "mark
this paper" currently has to make a raw vision-model call and write its
own rubric handling, mark caps and MCQ rules on top. This exposes the
grader Proctor AI runs for its own teachers as one synchronous endpoint,
with Bearer auth and no new engine capability.

## What Changes

- **connectors/proctorai**: 1 endpoint, `Authorization: Bearer` auth,
  300 s timeouts (a 20-page sheet takes up to ~90 s):
  - `proctorai#grade` (`POST /api/v1/grade`): a marking key (questions,
    max marks, expected answers, MCQ options, sub-parts) plus the answer
    sheet as page images and/or typed answers. Returns marks per question
    and sub-part with reasoning, transcription, page, confidence and a
    `needsReview` flag, plus totals and feedback.
- **Billing**: one pool `default` ("Proctor AI gradings"), provider-level
  `PER_CALL` 0.4. Proctor AI is prepaid and every 200 carries its own
  receipt at `billing.gradingsCharged`, so `usage.consolidate` plucks the
  `billing` node: the receipt settles the run (D27) and the platform
  account's `balance` never reaches the caller.
- **New category leaf** `education` in `connectors/categories.ts`.
- Fixtures: the 401 is RECORDED against production (unknown key,
  2026-10-20). Happy and 402 out-of-balance are `synthetic-`, shaped
  from the vendor's published response.

## Capabilities

- `proctorai-connector`.

## Non-goals

- Proctor AI's teacher-account surface (classes, students, stored
  submissions, its MCP server). It is per-teacher data and cannot sit
  behind one platform key.
- `GET /api/v1/account`: it reports the platform account's own balance,
  which is not the caller's business.

## Impact

New connector tree and one new category leaf. No schema or engine change:
`ENGINE_VERSION` unchanged, no new `Unit`, preset or hook.
