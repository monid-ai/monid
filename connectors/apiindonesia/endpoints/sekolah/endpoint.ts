import { defineEndpoint } from "@shared/core";
import { zSekolahQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/sekolah. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia School Directory",
        summary:
            "Search Indonesia's schools by name or NPSN, filtered by region, level " +
            "and status.",
        description:
            "Search and list Indonesian schools from the Ministry of Education " +
            "reference data: about 93,000 SD, SMP, SMA, SMK and SLB records, each " +
            "with its NPSN (national school id), status (Negeri/Swasta), " +
            "accreditation, address, coordinates and, when published, phone, email " +
            "and website. Filter by province, regency or district code, level, status " +
            "and accreditation, or pass `q` for an exact NPSN or a name prefix. " +
            "Region codes come from `apiindonesia#wilayah/search`. Paginated; read " +
            "`meta.total_pages` to page further.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#sekolah",
        categories: ["government-data"],
    },
    request: { method: "GET", path: "/sekolah" },
    input: { schema: { queryParams: zSekolahQueryParams } },
});
