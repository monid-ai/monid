import { z } from "zod";
import { zReadResult } from "../../../schema/output.ts";

export const zOutput = zReadResult.extend({
    data: z.looseObject({
        access: z.looseObject({
            state: z.string(),
            accessEndsAt: z.iso.datetime().nullable(),
        }),
        accounts: z.looseObject({
            count: z.number().int().nonnegative(),
            needsActionCount: z.number().int().nonnegative(),
        }),
        steps: z.array(z.looseObject({
            step: z.enum([
                "subscription",
                "connect_accounts",
                "fix_connections",
            ]),
            status: z.enum(["done", "action_needed", "optional"]),
            url: z.url(),
        })),
        manageAgentAccessUrl: z.url(),
    }),
});
