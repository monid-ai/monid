import { z } from "zod";

/** Largest employer id Glassdoor's GraphQL layer accepts (a signed 32-bit
 *  Int); the vendor rejects anything above it. */
const glassdoorEmployerIdMax = 2_147_483_647;

/**
 * Employer target shared by the Glassdoor company tools (profile, jobs,
 * reviews, salaries, interviews, benefits).
 *
 * The vendor requires `employerUrl` or `employerId` and allows both, so the
 * identifier is mirrored as a union of two strict objects: each branch
 * requires one key and leaves the other optional. The vendor's own
 * superRefine (a URL must be a Glassdoor employer URL, and both keys must
 * name the same employer) cannot reach the JSON Schema, so `bothRule`
 * states it in the field text. The vendor treats an empty `employerUrl` as
 * absent, so the branch that requires the URL also requires one character.
 *
 * `shape` carries the tool's own fields into both branches.
 */
export function zGlassdoorEmployerBody<Shape extends z.ZodRawShape>(
    shape: Shape,
    bothRule: string,
) {
    const employerUrl = z.string().describe(
        "Glassdoor employer page URL that contains the employer id, e.g. " +
            "'https://www.glassdoor.com/Overview/Working-at-Google-EI_IE9079.htm' " +
            "(the id is the number after '_IE' or '-E'). Must be a " +
            "glassdoor.com URL. Do not send an empty string. Provide " +
            "employerUrl or employerId. " + bothRule,
    );
    const employerId = z.number().int().positive().max(glassdoorEmployerIdMax)
        .describe(
            "Glassdoor employer id (1-2147483647), e.g. 9079. Provide " +
                "employerId or employerUrl. " + bothRule,
        );
    return z.union([
        z.object({
            employerUrl: employerUrl.min(1),
            employerId: employerId.optional(),
            ...shape,
        }).strict(),
        z.object({
            employerUrl: employerUrl.optional(),
            employerId,
            ...shape,
        }).strict(),
    ]).describe(
        "Identify the employer with employerUrl, employerId, or both; at " +
            "least one is required.",
    );
}

/** Rule text for the five tools that cross-check the two employer keys. */
export const glassdoorEmployerMustMatch =
    "When both are given they must identify the same employer.";
