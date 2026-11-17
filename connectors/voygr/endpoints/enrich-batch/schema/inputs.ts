import { z } from "zod";
import {
    zEnrichOptions,
    zPlaceFields,
} from "../../../schema/enrich-options.ts";

/**
 * `POST /v1/jobs/enrich` takes a whole `/v1/enrich` body per row, but the
 * job's status only counts how many rows succeeded, not which. So the
 * places come as a list and the attributes and checks once, for every
 * place: every row then has the same price, and the bill is the rows that
 * succeeded times that price. Left out, as on voygr#enrich: `pois`,
 * `sample`, `estimate_only`, `response_format`, `verify_identity`. Also
 * `max_credits`: the price of the whole job is the estimate, known before
 * it runs.
 */
export const zEnrichBatchBody = z.strictObject({
    ...zEnrichOptions,
    places: z.array(z.strictObject(zPlaceFields)).min(1).max(10_000).describe(
        "The places to enrich, 1 to 10,000. The attributes and checks " +
            "below apply to every place.",
    ),
});
