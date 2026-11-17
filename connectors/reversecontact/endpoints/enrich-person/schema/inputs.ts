import { z } from "zod";
import { zCompanyDomain } from "../../../schema/common.ts";

/**
 * POST /v2/enrich/persons body (the deprecated, ignored `fullProfile` flag
 * is left out). The vendor needs at least one PERSON identifier (email,
 * firstName or lastName): company fields alone answer 422
 * `MISSING_PERSON_IDENTIFIER`. Bound as a union of three arms.
 */
const zEnrichPersonFields = z.object({
    email: z.email().describe(
        "The person's email address, ideally a work email. The most " +
            "precise identifier.",
    ).optional(),
    firstName: z.string().min(1).describe("First name.").optional(),
    lastName: z.string().min(1).describe("Last name.").optional(),
    companyDomain: zCompanyDomain.optional(),
    companyName: z.string().min(1).describe(
        "Company name, when the domain is unknown.",
    ).optional(),
}).strict();

export const zEnrichPersonBody = z.union([
    zEnrichPersonFields.required({ email: true }),
    zEnrichPersonFields.required({ firstName: true }),
    zEnrichPersonFields.required({ lastName: true }),
]).describe(
    "Provide an `email`, or a name (`firstName` and `lastName`) with " +
        "`companyDomain` or `companyName`. Company fields alone are not " +
        "enough.",
);
