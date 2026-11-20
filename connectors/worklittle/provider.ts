import { defineProvider, presets } from "@shared/core";

/**
 * Worklittle (worklittle.com) — live job listings read straight from
 * company career pages, plus resume and cover-letter writing tailored to
 * one of those jobs. JSON over HTTPS against `https://api.worklittle.com`,
 * bearer auth with an `sk-wl-api01-` key.
 *
 * ONE PLATFORM KEY, MANY PEOPLE. Monid runs every caller on one Worklittle
 * key created with `profile_access: none`: it never reads or writes the key
 * owner's own profile. Every person is an APPLICANT: saved by `apply/profile`
 * (or a first `apply` with `applicant` {name, email} + resume), addressed by
 * `applicant_id` afterwards; documents take the candidate inline or by
 * `applicant_id`.
 * The key needs scopes `jobs:read`, `jobs:apply`, `jobs:apply_with_ai` AND
 * `jobs:documents` (the admin "platform" preset omits the last one).
 *
 * Eight endpoints (one per job an agent does), two shapes:
 *   - SYNC, FREE on Worklittle's card (`GET /v1/pricing`, 2026-10-29): job
 *     search (with `job_id` for one job in full), salary average, company
 *     search (free monthly quotas; over quota is a 429 `QUOTA_EXCEEDED`,
 *     never a charge), `apply/profile` (save / get / delete) and
 *     `apply/{id}` (status / continue / approve_submit / stop).
 *   - ASYNC, paid: `apply` (1–10 jobs, flat $0.20 per application that
 *     reaches an outcome), resumes and cover letters ($0.01 each). Each authors its own
 *     lifecycle (a provider-level `start` would replace declarative
 *     execution on the sync endpoints too).
 *
 * BILLING. Every Worklittle price is a flat USD amount and token usage is
 * never billed, so the pool is US dollars. Worklittle responses carry no
 * money (prices are on `GET /v1/pricing`), so every bill is the derived
 * fold: evidence × the pinned flat rate. Free reads carry quota counts at
 * `meta.quota`; the consolidate strips them, since they describe Monid's
 * shared Worklittle account, not the caller's.
 */
export default defineProvider({
    name: "worklittle",
    meta: {
        displayName: "Worklittle Jobs",
        summary:
            "7.5M+ live jobs from company career pages, updated hourly; applies and submits for people; tailored resumes and cover letters.",
        description: "Worklittle indexes over a million live job " +
            "postings read directly from company career pages, refreshed " +
            "hourly, so listings are current employer postings, not " +
            "job-board reposts. Search by title, place, distance, country, remote, " +
            "employment type, seniority, posting age, visa sponsorship, " +
            "minimum salary and employer; read one job in full; get the " +
            "average salary for a role; apply and submit for a person in " +
            "Worklittle's cloud, automatically (it fills the employer's own " +
            "form, tailors the resume and submits); and write a " +
            "one-page resume or cover letter tailored to a job. The usual " +
            "chain: jobs/search -> apply/profile (save) -> apply -> " +
            "apply/{id} -> apply/profile (get: applications and " +
            "employer emails). " +
            "Everything is free except applications ($0.20 each, once per " +
            "person per job, only on an outcome) and documents ($0.01 " +
            "each, only when one is returned).",
        homepageUrl: "https://worklittle.com",
        docsUrl: "https://docs.worklittle.com",
        categories: ["jobs"],
        notes: [
            "Errors come back as `{error: {code, message, " +
            "documentation_url?}}` and are free. `QUOTA_EXCEEDED` (429) " +
            "means the shared free monthly quota is spent; `RATE_LIMITED` " +
            "(429) is per-minute throttling.",
            "Job ids are opaque strings from search results. Never " +
            "construct one; a made-up id answers 404 NOT_FOUND.",
            "An applicant_id works with any key that holds it: treat it " +
            "like a credential for that person and never show one person " +
            "another's.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.worklittle.com" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system (design D26): Worklittle prices every paid
         *  call as one flat USD amount (`GET /v1/pricing`), so the pool IS
         *  dollars — the exa / dataforseo posture. */
        credits: { default: { label: "US dollars" } },
        /** No vendor claim (design D27): Worklittle answers carry no money,
         *  so the derived fold settles. The quota counts (`meta.quota`, or
         *  top-level `quota`) describe Monid's shared account and never
         *  reach the caller. */
        consolidate: ({ data, utils }) => {
            const meta = utils.json.pluck(data.output, "$.meta.quota");
            const top = utils.json.pluck(meta.rest, "$.quota");
            return { credits: {}, output: top.rest };
        },
    },
    output: {
        /** Worklittle's error envelope is `{error: {code, message,
         *  documentation_url?}}`. The machine `code` is what an agent
         *  branches on (`NOT_FOUND`, `QUOTA_EXCEEDED`, `BAD_REQUEST`). */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            // as in consolidate: Monid's shared-account quota never reaches
            // the caller, on errors either
            const meta = utils.json.pluck(data.output, "$.meta.quota");
            const quota = utils.json.pluck(meta.rest, "$.quota");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Worklittle API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: quota.rest,
            };
        },
    },
});
