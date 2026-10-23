import { z } from "zod";

const jobDetailFields = {
    fields: z.array(z.enum([
        "*",
        "jobId",
        "url",
        "profile",
        "location",
        "compensation",
        "employer",
        "meta",
    ])).optional().describe(
        "Fields to include in the job object. Omit for the defaults " +
            "(jobId, url, profile, location, compensation, employer, meta). " +
            'Use ["*"] for every field.',
    ),
};

const bothRule = "When both are given they must identify the same job, " +
    "else the vendor returns 400.";

const jobId = z.number().int().positive().describe(
    "Glassdoor job listing id, a positive integer (the `jl` value of a " +
        "Glassdoor job URL). Provide jobId or jobUrl. " + bothRule,
);
const jobUrl = z.string().describe(
    "Glassdoor job URL over https; the listing id is read from its `jl` or " +
        "`jobListingId` query value, or from the trailing number of the " +
        "path. Provide jobUrl or jobId. " + bothRule,
);

/**
 * `POST /glassdoor/job-detail` request body, the vendor mirror. The vendor
 * requires `jobId` or `jobUrl` and allows both, so the identifier is a
 * union of two strict objects: each branch requires one key and leaves the
 * other optional. That the URL is a valid Glassdoor job URL, and that both
 * keys name the same job, are vendor rules the JSON Schema cannot carry.
 */
export const zGlassdoorJobDetailBody = z.union([
    z.object({
        jobId,
        jobUrl: jobUrl.optional(),
        ...jobDetailFields,
    }).strict(),
    z.object({
        jobId: jobId.optional(),
        jobUrl,
        ...jobDetailFields,
    }).strict(),
]).describe(
    "Identify the job with jobId, jobUrl, or both; at least one is required.",
);
