import { z } from "zod";
import { zIndicator } from "../../../schema/common.ts";

/** GET /v1/data_catalogue/{currency} query params (published OpenAPI). */
export const zDataCatalogueQueryParams = z.object({
    include_capabilities: z.boolean().describe(
        "Also return currency-scoped endpoint and auth metadata (default " +
            "false).",
    ).optional(),
    include_coverage: z.boolean().describe(
        "Also return the top-level coverage list. Per-indicator coverage " +
            "is on every entry regardless (default false).",
    ).optional(),
    indicator: zIndicator.describe(
        "Narrow the top-level coverage list to one indicator slug. Only " +
            "read when include_coverage is true.",
    ).optional(),
}).strict();
