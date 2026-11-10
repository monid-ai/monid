import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRemoteJobsAggregatorBody } from "./schema/inputs.ts";

/**
 * benthepythondev/remote-jobs-aggregator — Remote Jobs Aggregator.
 *
 * PURE DATA apart from the card: the async machinery (lifecycle +
 * fromError) is inherited from the apify provider; the actorId is baked
 * into the start path.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Remote Jobs Across Six Boards",
        summary: "Remote job listings from six keyless boards in one call, " +
            "deduplicated, with salary, seniority and eligible-country filters.",
        description: "Searches six public remote-job boards at once " +
            "(Arbeitnow, Jobicy, Himalayas, RemoteOK, Remotive, Working " +
            "Nomads) for one or more queries, removes the same job posted " +
            "on several boards, and returns one row per job: title, company, " +
            "location, normalized employment type and seniority, salary " +
            "range when the board gives one, tags, posting date, and the " +
            "apply link. Filters run before rows are saved: excluded words, " +
            "company, location, the countries a candidate may apply from " +
            "(read from the employer's own text), hybrid office days, job " +
            "type, seniority, salary-only and posting age. Rows are capped " +
            "by maxTotalJobs.",
        docsUrl: "https://apify.com/benthepythondev/remote-jobs-aggregator",
        categories: ["jobs"],
        notes: [
            "Billing: one dataset row per delivered job; maxTotalJobs is " +
            "the exact cap, so the pre-run estimate is maxTotalJobs rows.",
            "The monitor inputs (onlyNew, monitorId, firstRunMode, " +
            "resetState) keep state in the account that runs the actor and " +
            "are not offered here: every caller would share one memory.",
        ],
    },
    endpoint: "/benthepythondev/remote-jobs-aggregator",
    request: {
        method: "POST",
        path: "/v2/acts/benthepythondev~remote-jobs-aggregator/runs",
    },
    input: {
        schema: {
            // maxTotalJobs is the PRIMARY limiting knob — required at the
            // binding; 0 means "no total limit" in the actor, so the
            // binding floors it at 1 (D25). The monitor knobs are dropped
            // (state on the shared runner account).
            body: zRemoteJobsAggregatorBody
                .omit({
                    onlyNew: true,
                    monitorId: true,
                    firstRunMode: true,
                    resetState: true,
                    debugMode: true,
                })
                .extend({
                    maxTotalJobs: zRemoteJobsAggregatorBody.shape.maxTotalJobs
                        .unwrap().min(1),
                }),
        },
    },
    usage: {
        /** The WHOLE published card (D29); ids normalize from the event
         *  names (D28). Pins are the scheduled prices effective
         *  2026-11-09 (pricingInfos, read 2026-10-26); the price billing
         *  today is $0.012 per row and $0.008 per salary event. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "actor start",
                    // vendor charge event: "apify-actor-start", one per
                    // started GB; the actor runs at 512 MB → one event
                    consumes: { credit: "default", amount: 0.00004 },
                },
                default_dataset_item: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "jobs",
                    // vendor charge event: "apify-default-dataset-item"
                    consumes: { credit: "default", amount: 0.0048 },
                },
                salary_extracted: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "salary fields",
                    description: "published on the card but never charged by " +
                        "the actor (src/main.py charges only dataset rows)",
                    // vendor charge event: "salary-extracted"
                    consumes: { credit: "default", amount: 0.0024 },
                },
            },
        },
        estimate: ({ data }) => ({
            counts: {
                default_dataset_item: data.input.body.maxTotalJobs,
                salary_extracted: 0,
            },
        }),
        /** OVERRIDES the provider evidence: rows are jobs; the salary
         *  event is never charged by the actor. */
        evidence: ({ data }) => ({
            counts: {
                default_dataset_item: Array.isArray(data.output)
                    ? data.output.length
                    : 0,
                salary_extracted: 0,
            },
        }),
    },
});
