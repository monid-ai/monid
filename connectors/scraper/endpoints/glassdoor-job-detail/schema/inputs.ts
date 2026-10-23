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
    ])).describe(
        "Fields to include in the job object. Omit for the defaults " +
            "(jobId, url, profile, location, compensation, employer, meta). " +
            'Use ["*"] for every field.',
    ).optional(),
};

const bothRule = "When both are given they must identify the same job, " +
    "else the vendor returns 400.";

const jobId = z.number().int().positive().describe(
    "Glassdoor job listing id, a positive integer (the `jl` value of a " +
        "Glassdoor job URL). Provide jobId or jobUrl. " + bothRule,
);
/** https and a glassdoor.<suffix> host (the vendor accepts any public
 *  suffix, e.g. .com, .co.uk, .com.au), then an id: a `jl` or
 *  `jobListingId` query value, or a path that ends in `-<id>.htm`. */
const glassdoorJobUrlPattern =
    /^\s*https:\/\/(?:[A-Za-z0-9-]+\.)*glassdoor\.[a-z]{2,}(?:\.[a-z]{2,})?(?::[0-9]+)?\/(?:.*[?&](?:jl|jobListingId)=[0-9]+|[^?#]*-[0-9]+\.htm(?:[?#].*)?\s*$)/;

const jobUrl = z.string().regex(glassdoorJobUrlPattern).describe(
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
