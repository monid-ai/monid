import { z } from "zod";
import { zPerson } from "../../../schema/person.ts";

/** `POST /data/people/enrich-jobs` body — the mirror of Fuse's published
 *  request (design D25), STRICT like the API. Fuse also refuses a `find`
 *  naming a kind twice, which JSON Schema here cannot express (meta.notes). */
export const zStartEnrichJobBody = z.strictObject({
    people: z.array(zPerson).min(1).max(100).describe(
        "The people to enrich, 1 to 100, each a `linkedinUrl` or a `name` " +
            "with a `companyName` or `companyDomain`. Results come back in " +
            "the same order.",
    ),
    find: z.array(z.enum(["email", "phone"])).min(1).describe(
        "What to find for each person: `email`, `phone` or both.",
    ),
});
