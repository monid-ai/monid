import { z } from "zod";
import { zDealportUuid } from "../../../schema/common.ts";

/**
 * `POST /api/v1/pages` JSON request body mirror
 * (https://app.dealport.com/openapi/v1.json). Optionality and OpenAPI bounds
 * only; `force_refresh` default (`false`) and the non-empty target arm union
 * attach in `endpoint.ts`.
 */
export const zFetchCompanyPagesBody = z.object({
    company_ids: z.array(zDealportUuid).describe(
        "Dealport company UUIDs whose website pages should be read.",
    ).optional(),
    domains: z.array(z.string().min(1)).describe(
        "Company website hosts or registrable domains (e.g. ['acme.com']).",
    ).optional(),
    targets: z.array(z.string().min(1)).describe(
        "Mixed company UUIDs or domains.",
    ).optional(),
    paths: z.array(z.string().min(1)).max(5).describe(
        "Up to 5 relative website paths to read (default ['/', '/about', '/services', '/capabilities']).",
    ).optional(),
    force_refresh: z.boolean().describe(
        "Bypass the 30-day cache and fetch live from the company website ($0.01 per live company fetch).",
    ).optional(),
}).strict();
