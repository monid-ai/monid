import { z } from "zod";
import { zSearchCommon, zSearchService } from "../../../schema/common.ts";

/**
 * `POST /search` request body — the OpenAPI object variant, optionality
 * only (D25). The vendor also accepts a batch array of these objects (one
 * credit per item); the connector mirrors the single-object form — see
 * provider.ts.
 */
export const zSearchBody = z.object({
    ...zSearchCommon,
    search_service: zSearchService.optional().describe(
        "Search backend to use (default: the vendor's routing pick).",
    ),
});
