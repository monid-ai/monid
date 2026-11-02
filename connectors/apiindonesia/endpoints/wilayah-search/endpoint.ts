import { defineEndpoint } from "@shared/core";
import { zWilayahSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/wilayah/search. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia Region Search",
        summary:
            "Find Indonesian provinces, regencies, districts and villages by name.",
        description:
            "Search Indonesia's official administrative regions (Kemendagri codes) " +
            "across all four levels at once: provinsi, kabupaten/kota, kecamatan and " +
            "kelurahan/desa. Each result carries its code (`id`), name, alternate " +
            "name and `level`. Use it to turn a place name like 'Bandung' or " +
            "'Pontianak' into the region code that the other API Indonesia endpoints " +
            "take: a 4-digit regency code feeds `apiindonesia#sholat` (prayer times) " +
            "and `apiindonesia#cuaca` (`kabupaten_id`), a 2-digit province code feeds " +
            "`apiindonesia#sekolah`. It only matches names; for postal codes use " +
            "`apiindonesia#kodepos/search`.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#wilayah",
        categories: ["government-data", "maps"],
    },
    request: { method: "GET", path: "/wilayah/search" },
    input: { schema: { queryParams: zWilayahSearchQueryParams } },
});
