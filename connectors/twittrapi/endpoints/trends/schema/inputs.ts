import { z } from "zod";

/** `GET /trends/{locationId}` path params — vendor mirror (D25). */
export const zTrendsPathParams = z.object({
    locationId: z.string().regex(/^[0-9]{1,12}$/).describe(
        "Yahoo WOEID, digits only: 1 is worldwide, 23424977 the United " +
            "States.",
    ),
}).strict();
