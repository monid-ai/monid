import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zDatawebotSitesQueryParams } from "./schema/inputs.ts";

/** datawebot /sites — `GET /v1/sites`: free, runs nothing. */
export default defineEndpoint({
    meta: {
        displayName: "datawebot Sites",
        summary:
            "Check whether datawebot supports a shop, and the most a search or product read there costs.",
        description: "Free check before a paid call. Given a shop domain " +
            "or name, says whether datawebot Shop Search and datawebot " +
            "Product work there and the most credits each costs, whether " +
            "the shop's own raw records are available, and whether the " +
            "domain resolves at all. A shop name such as allbirds is " +
            "resolved for `country`; an ambiguous name fails with " +
            "`unknown_site` and lists candidates.",
        docsUrl: "https://www.datawebot.com/docs/api/reference",
        categories: ["web-scraping"],
    },
    endpoint: "/sites",
    request: { method: "GET", path: "/v1/sites" },
    input: { schema: { queryParams: zDatawebotSitesQueryParams } },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
