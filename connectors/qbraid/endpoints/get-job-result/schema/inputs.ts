import { z } from "zod";

/** GET /jobs/{qrn}/result query — qbraid-api job/shared/validators.ts
 *  `quantumJobSchemas.jobResult`: only the literal 'true' opts in (the
 *  engine stringifies the boolean). */
export const zGetJobResultQueryParams = z.object({
    includeMeasurements: z.boolean().describe(
        "true to include the raw per-shot measurements array (capped at " +
            "100 rows). Omit for the histogram only.",
    ).optional(),
});
