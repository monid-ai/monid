import { z } from "zod";

/**
 * benthepythondev/remote-jobs-aggregator — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/benthepythondev~remote-jobs-aggregator/builds/default →
 * actorDefinition.input) on 2026-10-26 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zRemoteJobsAggregatorBody = z.object({
    searchQueries: z.array(z.string()).describe(
        "One or more searches, e.g. 'python developer', 'react', 'marketing'. A job is kept when it matches any of them; inside one search all terms must appear somewhere in the job record. A job found by two searches is saved once. Leave empty for all available jobs.",
    ).optional(),
    searchKeywords: z.string().describe(
        "One search, e.g. 'python developer'. Kept so saved inputs keep working; it is searched together with Searches. Use Searches for new inputs.",
    ).optional(),
    platforms: z.array(
        z.enum([
            "arbeitnow",
            "jobicy",
            "himalayas",
            "remoteok",
            "remotive",
            "workingnomads",
        ]),
    ).describe("Choose the keyless sources to combine.").optional(),
    maxJobsPerPlatform: z.number().int().min(1).max(50).describe(
        "Maximum records collected from each selected source before cross-board deduplication.",
    ).optional(),
    maxTotalJobs: z.number().int().min(0).max(200).describe(
        "Maximum dataset rows across all boards. Use 0 for no total limit.",
    ).optional(),
    excludeKeywords: z.array(z.string()).describe(
        "Drop jobs containing any of these terms in the title, company, location, description, or tags.",
    ).optional(),
    companyKeywords: z.array(z.string()).describe(
        "Keep jobs whose company contains at least one supplied term.",
    ).optional(),
    locationKeywords: z.array(z.string()).describe(
        "Keep jobs whose location contains at least one term, such as Europe, Germany, or Worldwide.",
    ).optional(),
    eligibleFrom: z.array(z.string()).describe(
        'Keep jobs you can apply to from these countries or regions, read from the employer\'s own text ("must be based in", "authorized to work in", "CET +/- 3 hours"). Worldwide jobs always pass. Examples: Germany, India, Brazil, Europe, EMEA, LATAM. Leave empty to keep every job.',
    ).optional(),
    includeUnclearEligibility: z.boolean().describe(
        "With 'Where you can work from' set, also keep jobs whose listing names no country, region or worldwide hiring. Off by default.",
    ).optional(),
    excludeHybrid: z.boolean().describe(
        'Drop jobs whose text asks for office days ("hybrid work model", "3 days a week in the office").',
    ).optional(),
    jobTypes: z.array(
        z.enum([
            "full-time",
            "part-time",
            "contract",
            "freelance",
            "internship",
        ]),
    ).describe(
        "Keep selected normalized employment types. Jobs without a matching type are excluded when this filter is active.",
    ).optional(),
    seniorityLevels: z.array(
        z.enum([
            "entry",
            "senior",
            "lead",
            "manager",
            "executive",
            "unspecified",
        ]),
    ).describe(
        "Keep inferred levels based on title and tags. Unspecified roles are excluded when this filter is active.",
    ).optional(),
    salaryOnly: z.boolean().describe(
        "Return only jobs where the source provides salary data.",
    ).optional(),
    postedWithinDays: z.number().int().min(0).max(365).describe(
        "Keep jobs posted within this many days. Use 0 to disable. Records without a parseable date are excluded when enabled.",
    ).optional(),
    onlyNew: z.boolean().describe(
        "Persist a monitor baseline and return only unseen matching jobs on later runs. Designed for scheduled alerts.",
    ).optional(),
    monitorId: z.string().describe(
        "Optional stable name such as 'daily-python-europe'. Leave empty to derive one from the search and filters.",
    ).optional(),
    firstRunMode: z.enum(["emitAll", "seedOnly"]).describe(
        "Emit the bounded current baseline, or seed it silently so only later arrivals are returned.",
    ).optional(),
    resetState: z.boolean().describe(
        "Clear only the selected monitor scope before this run. Turn it off again after resetting.",
    ).optional(),
    debugMode: z.boolean().describe(
        "Enable verbose source and row logging for troubleshooting.",
    ).optional(),
});
