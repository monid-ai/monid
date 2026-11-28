import { z } from "zod";

/**
 * One person to enrich, as outbound.dev's single enrichment and each entry
 * of a batch take them: the mirror of the published request (design D25),
 * STRICT like the API. `personId` is NOT EXPOSED: it names a contact in the
 * outbound.dev workspace that holds the key, one workspace shared by every
 * caller on a broker.
 */
export const zPersonFields = z.strictObject({
    linkedinUrl: z.string().max(500).regex(
        /^(https?:\/\/)?([\w-]+\.)?linkedin\.com\/in\/[^\s/?#]+/,
    ).describe(
        "The person's LinkedIn profile URL, e.g. " +
            "`https://www.linkedin.com/in/ana-costa`. Send it on its own: " +
            "the most precise way to name them.",
    ).optional(),
    firstName: z.string().min(1).max(200).describe(
        "The person's first name, with `companyName` or `companyDomain`.",
    ).optional(),
    lastName: z.string().min(1).max(200).describe(
        "The person's last name, with `companyName` or `companyDomain`.",
    ).optional(),
    fullName: z.string().min(1).max(400).describe(
        "The person's full name, in place of `firstName` and `lastName`, " +
            "with `companyName` or `companyDomain`.",
    ).optional(),
    companyName: z.string().min(1).max(300).describe(
        "The name of the company the person works at.",
    ).optional(),
    companyDomain: z.string().min(1).max(300).describe(
        "The website domain of the company the person works at, e.g. " +
            "`fernway.co`: more precise than `companyName`.",
    ).optional(),
});

/** What to look in, as both enrichment routes take it. */
export const zProviders = z.enum(["package", "waterfall"]).describe(
    "Where to look: `package` (the default) searches outbound.dev's own " +
        "data package; `waterfall` searches the package, then a fixed " +
        "series of further providers until one finds it. A value's price " +
        "depends on who found it.",
);

const zByName = zPersonFields.omit({ linkedinUrl: true });
const zByFullName = zByName.omit({ firstName: true, lastName: true });
const zByNameParts = zByName.omit({ fullName: true });

/**
 * outbound.dev names a person ONE way, and refuses anything else with 422:
 * a `linkedinUrl` on its own, or a name (`fullName`, or `firstName`,
 * `lastName` or both) with `companyName` or `companyDomain`. So the mirror
 * is the union of those ways in.
 */
const PERSON_ARMS = [
    zPersonFields.pick({ linkedinUrl: true }).required(),
    zByFullName.required({ fullName: true, companyDomain: true }),
    zByFullName.required({ fullName: true, companyName: true }),
    zByNameParts.required({ firstName: true, companyDomain: true }),
    zByNameParts.required({ firstName: true, companyName: true }),
    zByNameParts.required({ lastName: true, companyDomain: true }),
    zByNameParts.required({ lastName: true, companyName: true }),
] as const;

/** One person, as each entry of a batch names them. */
export const zPerson = z.union(PERSON_ARMS);

/**
 * The single enrichment's body: one person, named as above, with `providers`
 * beside the person's own fields, as outbound.dev takes them. `find` is not
 * here: each lookup endpoint finds one kind and states it itself.
 */
export const zEnrichPersonBody = z.union(
    PERSON_ARMS.map((arm) => arm.extend({ providers: zProviders.optional() })),
);
