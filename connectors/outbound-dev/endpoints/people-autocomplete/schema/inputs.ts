import { z } from "zod";

/** `GET /people/autocomplete` query — the mirror of outbound.dev's published
 *  parameters (design D25). Both are required. STRICTER than the API on one
 *  point: it drops an unknown query key unread, and this refuses it. */
export const zPeopleAutocompleteQuery = z.strictObject({
    field: z.enum([
        "title",
        "company",
        "website",
        "location",
        "region",
        "school",
        "skill",
    ]).describe("The free-text people filter to suggest values for."),
    q: z.string().min(1).max(100).describe(
        "What has been typed so far, e.g. `head of operations`.",
    ),
});
