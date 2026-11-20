import { z } from "zod";
import {
    zCompanyIdentifier,
    zGetDetailedEducation,
    zGetDetailedWorkExperience,
    zLocation,
    zLooseValue,
    zValue,
} from "../../../schema/common.ts";

/** Body of POST /v1/kitchen-sink/person (KitchenSinkProfile). */
export const zKitchenSinkPersonBody = z.object({
    profileIdentifier: z.discriminatedUnion("identifier", [
        z.object({
            identifier: z.literal("linkedinSlug").describe(
                "Identifier kind: linkedinSlug.",
            ),
            value: z.string().min(1).describe(
                "The person's LinkedIn slug (e.g. 'williamhgates').",
            ),
        }),
        z.object({
            identifier: z.literal("linkedinUrl").describe(
                "Identifier kind: linkedinUrl.",
            ),
            value: z.string().min(1).describe(
                "The person's LinkedIn URL (e.g. " +
                    "'https://www.linkedin.com/in/williamhgates'); https:// " +
                    "and www are optional.",
            ),
        }),
        z.object({
            identifier: z.literal("userID").describe(
                "Identifier kind: userID.",
            ),
            value: z.string().min(1).describe(
                "The person's LinkedIn user ID.",
            ),
        }),
    ]).optional().describe(
        "LinkedIn profile identifier. The most accurate input.",
    ),
    emailAddress: z.email().optional().describe(
        "Email address to look up. Second-best accuracy after " +
            "profileIdentifier.",
    ),
    personName: zLooseValue(
        "The person's name (first and/or last), as written on LinkedIn.",
        "If true, allows partial and out-of-order name matches. Fiber " +
            "default false (exact full-name match).",
    ).optional().describe(
        "The person's name. Best combined with companyDomain or " +
            "companyIdentifier.",
    ),
    jobTitle: zValue("The person's job title.").describe(
        "The person's current job title.",
    ).optional(),
    companyIdentifier: zCompanyIdentifier.optional().describe(
        "LinkedIn identifier of the person's current company; used with " +
            "personName.",
    ),
    linkedinHeadline: zLooseValue(
        "The person's LinkedIn headline (the first line of the profile).",
        "If true, allows extra words between the headline terms ('Software " +
            "Engineer' matches 'Software Development Engineer'). Fiber " +
            "default false (phrase match).",
    ).describe("The person's LinkedIn headline.").optional(),
    companyName: zValue("Name of the person's current company.")
        .describe("Name of the person's current company.").optional(),
    companyDomain: zValue(
        "Domain of the person's current company (e.g. 'fiber.ai').",
    ).optional().describe(
        "Domain of the person's current company; used with personName.",
    ),
    profileLocation: zLocation.optional().describe(
        "Where the person is based — country code, state, and/or free text.",
    ),
    schoolName: zValue(
        "Name of a school the person attends or attended.",
    ).describe("A school the person attends or attended, by name.")
        .optional(),
    schoolIdentifier: z.discriminatedUnion("identifier", [
        z.object({
            identifier: z.literal("linkedinOrgID").describe(
                "Identifier kind: linkedinOrgID.",
            ),
            value: z.string().min(1).describe(
                "The school's LinkedIn organization ID.",
            ),
        }),
        z.object({
            identifier: z.literal("linkedinUrl").describe(
                "Identifier kind: linkedinUrl.",
            ),
            value: z.string().min(1).describe("The school's LinkedIn URL."),
        }),
        z.object({
            identifier: z.literal("linkedinSlug").describe(
                "Identifier kind: linkedinSlug.",
            ),
            value: z.string().min(1).describe("The school's LinkedIn slug."),
        }),
    ]).optional().describe(
        "LinkedIn identifier of a school the person attends or attended.",
    ),
    schoolDomain: zValue(
        "Domain of a school the person attends or attended (e.g. " +
            "'stanford.edu').",
    ).describe("A school the person attends or attended, by domain.")
        .optional(),
    numProfiles: z.number().int().min(1).max(10).describe(
        "Maximum number of people to return, best match first (1-10). Each " +
            "person returned is charged. Fiber default 1.",
    ).optional(),
    liveFetch: z.boolean().describe(
        "When true, also fetches each matched profile live from LinkedIn " +
            "(freshest data, or profiles not yet indexed) — an extra charge " +
            "per person. Fiber default false.",
    ).optional(),
    forceCompanyMatch: z.boolean().optional().describe(
        "When true, only returns people who work at the given company. " +
            "Fiber default false (name matches elsewhere can be returned).",
    ),
    fuzzySearch: z.boolean().optional().describe(
        "When true, enables fuzzy name matching for uncertain spellings. " +
            "Fiber default false.",
    ),
    thoroughness: z.enum(["low", "high"]).optional().describe(
        "'high' spends more time (an AI-assisted fallback) to recover more " +
            "matches; 'low' answers faster. Fiber default 'high'.",
    ),
    getDetailedEducation: zGetDetailedEducation.optional(),
    getDetailedWorkExperience: zGetDetailedWorkExperience.optional(),
});
