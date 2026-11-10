import { z } from "zod";
import {
    zEnrichOptions,
    zPlaceFields,
} from "../../../schema/enrich-options.ts";

/**
 * `POST /v1/enrich` for ONE place (VOYGR's flat shape). Left out on purpose:
 *   - `pois` and `sample`: the list shape returns a different, matrix-shaped
 *     answer and bills per row
 *   - `estimate_only`: a dry run answers 200 and bills nothing, but this
 *     endpoint settles on the request, so a dry run would be charged
 *   - `response_format`: `cell` changes the answer's shape
 *   - `verify_identity`: deprecated for `verify_name` plus `verify_address`
 * The object is strict, so a field VOYGR adds later is refused here rather
 * than sent without a rule for what it costs.
 */
export const zEnrichBody = z.strictObject({
    ...zPlaceFields,
    ...zEnrichOptions,
    max_credits: z.number().int().min(0).optional().describe(
        "A ceiling for this request. If VOYGR's estimate is higher it " +
            "refuses with 402 before running anything.",
    ),
});
