import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Proctor AI (proctorai.io) — AI grading of handwritten exam answer
 * sheets against a teacher's marking key. One synchronous REST endpoint,
 * `POST https://agent.proctorai.io/api/v1/grade`, Bearer auth.
 *
 * The rest of Proctor AI (classes, students, submissions, its MCP server)
 * is scoped to one teacher's account and is not exposed here; the public
 * API is stateless, so one platform key serves every caller without any
 * of them seeing another's data (design D1).
 *
 * Billing: Proctor AI is prepaid in "gradings". One sheet, up to 20
 * pages, costs 0.4 of a grading, taken before the sheet is graded and
 * returned if grading fails. Every 200 carries the vendor's own receipt
 * at `billing.gradingsCharged`, so `consolidate` lifts it out and it wins
 * over the derived fold (design D2). Errors (401/402/422/502) never
 * charge, which the engine's zero-bill on non-2xx already matches.
 */
export default defineProvider({
    name: "proctorai",
    meta: {
        displayName: "Proctor AI",
        summary: "Grade handwritten exam answer sheets against a " +
            "marking key.",
        description: "AI grading for schools and colleges. Hand it a " +
            "question paper with the marks and expected answers, plus " +
            "photos of a student's handwritten answer sheet, and it marks " +
            "every question the way a careful examiner would: marks per " +
            "question and sub-part, written feedback, what it read on the " +
            "page, a confidence score, and a flag on anything a teacher " +
            "should double-check. It finds answers by the student's own " +
            "numbering across pages, so a sheet does not need to be in " +
            "question order.",
        homepageUrl: "https://proctorai.io",
        docsUrl: "https://agent.proctorai.io/developers",
        categories: ["education"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://agent.proctorai.io" },
    timeouts: { requestMs: 300_000, runMs: 300_000 },
    usage: {
        /** THE credit system (design D26): Proctor AI's own prepaid
         *  unit. Bought at ~$0.26 each; a sheet is 0.4 of one. */
        credits: { default: { label: "Proctor AI gradings" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "answer sheet",
            consumes: { credit: "default", amount: 0.4 },
        },
        /** The vendor's OWN claim (design D27): every 200 carries
         *  `billing: {gradingsCharged, balance}`. Pluck the whole node —
         *  `balance` is the platform account's, not the caller's, and
         *  must not ride out in the output. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.billing",
            );
            const charged = value === undefined
                ? undefined
                : utils.json.optionalNum(value, "$.gradingsCharged");
            return {
                credits: {
                    ...(charged !== undefined ? { default: charged } : {}),
                },
                output: rest,
            };
        },
    },
});
