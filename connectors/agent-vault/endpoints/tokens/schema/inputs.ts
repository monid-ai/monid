import { z } from "zod";

/** GET /v1/tokens query. */
export const zTokensQueryParams = z.object({
    url: z.string().describe(
        "Page URL. Narrows `cards` and `logins` to those registered for that site and adds `relatedLogins`. Cards that work on any site are always included.",
    ).optional(),
    host: z.string().describe("Alias of `url`.").optional(),
});
