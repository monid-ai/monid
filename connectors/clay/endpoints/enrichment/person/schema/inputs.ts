import { z } from "zod";
import { zPersonSocialProfileField } from "../../../../schema/common.ts";

/**
 * Clay-managed "Enrich person" function inputs (upstream keys, verbatim).
 *
 * Upstream declares no required field, but a body with NEITHER identifier
 * runs — and can draw for — a search for nobody. v1 enforced that with a
 * `.refine`; a cross-field refinement cannot survive JSON-Schema
 * compilation (fundable design D6), so it is a DOCUMENTED constraint here
 * and Clay answers 400 error-as-data.
 */
export const AT_LEAST_ONE_IDENTIFIER =
    "Provide at least one of 'Professional Profile URL' or 'Email' — a " +
    "body with neither resolves nobody.";

export const zEnrichPersonBody = z.object({
    "Professional Profile URL": zPersonSocialProfileField.optional(),
    "Email": z.string().min(1).optional().describe(
        "The person's email address (work or personal).",
    ),
}).strict().describe(AT_LEAST_ONE_IDENTIFIER);
