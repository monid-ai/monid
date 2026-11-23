import { z } from "zod";

export const zV3EventsPredictionMarketsQueryParams = z.object({
    ids: z.array(z.guid()).min(1).max(30).describe(
        "Up to 30 event, storyline or arc ids, in any mix, from " +
            "elfa#v3/events, elfa#v3/events/storylines or " +
            "elfa#v3/events/arcs. An id Elfa does not hold is skipped.",
    ),
    limit: z.number().int().min(1).max(30).describe(
        "Markets per id. Default 10, maximum 30.",
    ).optional(),
}).strict();
