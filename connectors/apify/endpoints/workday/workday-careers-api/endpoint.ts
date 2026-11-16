import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWorkdayCareersApiBody } from "./schema/inputs.ts";
import { zWorkdayCareersApiOutput } from "./schema/output.ts";

/**
 * johnvc/workday-careers-api — List Workday Jobs.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "List Workday Jobs",
        summary:
            "Extract every job from any Workday careers site as structured " +
            "JSON with descriptions and apply URLs.",
        description:
            "Crawls one or more Workday careers sites (myworkdayjobs.com or " +
            "myworkdaysite.com) and returns each job's title, location, ISO " +
            "posted date, full description (HTML and/or text), pay range, " +
            "employment type, remote status, and apply URL, with an " +
            "optional keyword search and posted-after filter. One row per " +
            "job.",
        docsUrl: "https://apify.com/johnvc/workday-careers-api",
        categories: ["jobs"],
        notes: [
            "Billing: one actor-start event per run plus one job-result " +
            "event per job returned.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/workday-careers-api",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~workday-careers-api/runs",
    },
    // the actor's own published default run timeout exceeds the
    // provider's 300 s budget (defaultRunOptions.timeoutSecs, 2026-09-22)
    timeouts: { runMs: 3_600_000 },
    input: {
        schema: {
            body: zWorkdayCareersApiBody.extend({
                // maxJobsPerSite is the limiting knob and the actor documents
                // 0 = all jobs on the site — WE require it, floored at 1, so
                // the estimate is deducible (D25)
                maxJobsPerSite: zWorkdayCareersApiBody.shape.maxJobsPerSite
                    .unwrap().min(1),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zWorkdayCareersApiOutput },
    usage: {
        /** The WHOLE published card (design D29): every charge event the
         *  actor publishes is a line, ids normalize from the event names
         *  (D28), amounts are the Business-tier rates. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "actor start",
                    // vendor charge event: "actor-start"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.00085738 },
                },
                job_result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "jobs",
                    // vendor charge event: "job-result"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.0001 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    job_result: body.maxJobsPerSite * body.startUrls.length,
                },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const jobs = rows.filter((row) =>
                utils.json.optionalGet(row, "$.resultType") !== "error"
            ).length;
            return { counts: { job_result: jobs } };
        },
    },
});
