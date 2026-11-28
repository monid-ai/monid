import { z } from "zod";
import { zPerson, zProviders } from "../../../schema/person.ts";

/** `POST /people/enrich/batch` body — the mirror of outbound.dev's published
 *  request (design D25), STRICT like the API. */
export const zEnrichBatchBody = z.strictObject({
    people: z.array(zPerson).min(1).max(100).describe(
        "The people to enrich, 1 to 100, each named one way: a " +
            "`linkedinUrl` on its own, or a name (`fullName`, or " +
            "`firstName` and `lastName`) with `companyName` or " +
            "`companyDomain`. Results come back in the same order.",
    ),
    find: z.enum(["email", "phone", "email_and_phone"]).describe(
        "What to find for every person: a work `email` (the default), a " +
            "`phone` number, or both (`email_and_phone`).",
    ).optional(),
    providers: zProviders.optional(),
    maxSpendUsd: z.number().min(0.01).max(1_000_000).describe(
        "The most the job may cost, in US dollars. A job that could cost " +
            "more is refused with 422 `max_spend_exceeded` before anything " +
            "starts.",
    ).optional(),
});
