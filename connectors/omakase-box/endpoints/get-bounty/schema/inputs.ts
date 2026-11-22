import { z } from "zod";

export const zBountyPathParams = z.strictObject({
    id: z.string().regex(/^bt-[a-f\d]{12}$/).describe(
        "Board bounty id from the list, not a GitHub issue number.",
    ),
});
