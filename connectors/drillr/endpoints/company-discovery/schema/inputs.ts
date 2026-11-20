import { z } from "zod";
import { zEnumList } from "../../../schema/common.ts";

/** GET /company-discovery query params
 *  (drillr.ai/docs/api/company-discovery). */
export const zCompanyDiscoveryQueryParams = z.object({
    query: z.string().min(1).describe(
        "Plain-language description of the companies wanted, e.g. 'US " +
            "companies that design GPUs for data centers'. Matched by " +
            "meaning, not by keyword.",
    ),
    market: zEnumList(["US", "CN", "JP", "HK", "KR"]).describe(
        "Restrict to markets: `US`, `CN`, `JP`, `HK`, `KR`, several " +
            "comma-separated (`US,JP`). Default: all five.",
    ).optional(),
}).strict();
