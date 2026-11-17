import { z } from "zod";

/** `GET /explore-variables` query params (monid-services
 *  `adaptors/census/endpoints/explore-variables.ts`). */
export const zExploreVariablesQueryParams = z.object({
    keyword: z.string().min(1).describe(
        "A topic keyword to search the Census variable catalog for (e.g. " +
            "'veterans', 'income', 'commute', 'broadband').",
    ),
}).strict();
