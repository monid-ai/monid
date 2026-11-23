import { z } from "zod";

export const zV3CallsPositioningQueryParams = z.object({
    entityId: z.guid().describe(
        "An asset family UUID from elfa#v3/entities.",
    ),
}).strict();
