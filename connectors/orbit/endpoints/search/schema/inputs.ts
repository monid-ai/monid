import { z } from "zod";

/**
 * `POST /v3/search` body — the faithful mirror of the published v3
 * `SearchRequest` and the components it references (design D25): optionality
 * only, no `.default()`. Orbit's own documented defaults are applied at the
 * BINDING in endpoint.ts, so the estimate reads concrete numbers.
 *
 * Orbit requires at least one of `query`, `intent` or `signals`. That is a
 * cross-field rule, and cross-field rules do not survive JSON Schema
 * compilation — it is stated in the descriptions below, and Orbit answers a
 * request that satisfies none of them with a `400`, which arrives as data.
 */

export const zIntegerRange = z.object({
    min: z.number().int(),
    max: z.number().int(),
});

export const zExperienceIntent = z.object({
    title: z.string().optional(),
    titleAnyOf: z.array(z.string()).optional().describe(
        "Match any one of these titles.",
    ),
    organization: z.string().optional(),
    year: z.number().int().optional(),
    startYear: z.number().int().optional(),
    startYearLte: z.number().int().optional(),
    endYear: z.number().int().optional(),
    temporalScope: z.enum(["current", "historical", "both"]).optional()
        .describe(
            "`current` matches the role they hold now, `historical` a role " +
                "they held, `both` either.",
        ),
});

export const zSchoolIntent = z.object({
    school: z.string().optional(),
    schoolAnyOf: z.array(z.string()).optional(),
    graduationYear: z.number().int().optional(),
    startYear: z.number().int().optional(),
    endYear: z.number().int().optional(),
    temporalScope: z.enum(["current", "historical", "both"]).optional(),
    relation: z.string().optional().describe(
        "How the person relates to the school, for example `student` or " +
            "`faculty`.",
    ),
});

export const zGeoIntent = z.object({
    place: z.string().optional().describe(
        "A place name: a city, a region, or a country.",
    ),
    isHistorical: z.boolean().optional().describe(
        "Match somewhere the person lived before.",
    ),
    distance: z.string().optional().describe(
        "A radius around the place, written the way a person would say it: " +
            "`25 miles`.",
    ),
});

export const zDemographicsIntent = z.object({
    ageRange: zIntegerRange.optional(),
    birthYearRange: zIntegerRange.optional(),
    gender: z.string().optional(),
});

export const zPersonalizationIntent = z.object({
    network: z.object({ scope: z.literal("first_degree") }).optional(),
    nearMe: z.object({ distance: z.string() }).optional(),
});

export const zSemanticClause = z.object({
    text: z.string().min(1).optional().describe(
        "A trait in plain English — `writes about climate policy`.",
    ),
    anyOf: z.array(z.string().min(1)).min(1).optional().describe(
        "Match any one of these traits.",
    ),
}).describe("Carries `text`, `anyOf`, or both.");

export const zStructuredIntent = z.object({
    names: z.array(z.string().min(1)).optional(),
    experiences: z.array(zExperienceIntent).optional().describe(
        "Roles and employers.",
    ),
    semanticClauses: z.array(zSemanticClause).optional().describe(
        "Traits matched by meaning rather than by keyword.",
    ),
    schools: z.array(zSchoolIntent).optional(),
    geo: zGeoIntent.nullable().optional(),
    demographics: zDemographicsIntent.nullable().optional(),
    personalization: zPersonalizationIntent.nullable().optional(),
}).describe(
    "Structured criteria. Carries at least one field. Sent alongside " +
        "`query`, it overlays the criteria Orbit derived from that query: " +
        "arrays and scalars replace, nested objects merge field by field.",
);

export const zIdentitySignals = z.object({
    address: z.string().min(1).optional(),
    email: z.email().optional(),
    phone: z.string().min(1).optional(),
    linkedin_url: z.url().optional().describe(
        "A professional-network profile URL for the person.",
    ),
    urls: z.array(z.url()).optional().describe(
        "Pages about the person: a personal site, a company bio, a press " +
            "mention.",
    ),
    usernames: z.array(z.string().min(1)).optional().describe(
        "Social handles the person posts under.",
    ),
}).describe(
    "What you already know about the person. Carries at least one signal. " +
        "An address, an email or a phone number can each belong to several " +
        "people, which is what `candidate_discovery` resolves.",
);

export const zOrbitSearchBody = z.object({
    request_id: z.string().min(1).optional().describe(
        "Your idempotency key. Reuse it to retry the same logical search.",
    ),
    query: z.string().min(1).optional().describe(
        "A plain-English description of the people you want — `machine " +
            "learning engineers at Anthropic near San Francisco`, or simply " +
            "a person's name.",
    ),
    intent: zStructuredIntent.optional(),
    signals: zIdentitySignals.optional(),
    candidate_discovery: z.boolean().optional().describe(
        "Continue past the people Orbit can name immediately and resolve " +
            "further candidates from the signals you sent. Each returned " +
            "profile draws 1 credit.",
    ),
    candidate_discovery_limit: z.number().int().min(1).max(50).optional()
        .describe(
            "The most candidates discovery returns. Read with " +
                "`candidate_discovery: true`.",
        ),
    profile_depth: z.enum(["partial", "full"]).optional().describe(
        "The depth every ready result reaches. `partial` is a useful " +
            "profile; `full` is the deepest profile Orbit builds, and takes " +
            "longer.",
    ),
    include_profile: z.boolean().optional().describe(
        "Embed each readable result's profile in the snapshot.",
    ),
    limit: z.number().int().min(1).max(100).optional().describe(
        "The most matches returned from the Orbit index. Candidate " +
            "Discovery results append beyond it.",
    ),
});
