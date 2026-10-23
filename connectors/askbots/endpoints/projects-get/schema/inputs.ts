import { z } from "zod";

/** `{id}` of the AskBots project. */
export const zProjectPathParams = z.object({
    id: z.string().min(1).describe("AskBots project id."),
});
