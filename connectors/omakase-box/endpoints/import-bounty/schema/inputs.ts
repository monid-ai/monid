import { z } from "zod";

export const zImportBody = z.strictObject({
    issue: z.string().regex(
        /^https:\/\/github\.com\/[A-Za-z\d-]{1,39}\/[A-Za-z\d._-]{1,100}\/issues\/\d{1,9}\/?$/,
    ).describe(
        "Public GitHub issue URL in a repository you own or can write to; the board verifies public visibility and that it is an open issue, not a PR.",
    ),
    reward: z.number().int().min(1).max(100000).describe(
        "Reward in whole US dollars, 1–100000 inclusive; a human pays the chosen solver after approval on GitHub.",
    ),
});
