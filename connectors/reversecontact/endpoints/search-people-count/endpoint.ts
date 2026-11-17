import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSearchPeopleCountBody } from "./schema/inputs.ts";

/** POST /v2/search/people/count: the size of a People Search, free. */
export default defineEndpoint({
    meta: {
        displayName: "Count People",
        summary: "Count the people matching People Search filters, for " +
            "free, before paying for pages.",
        description: "Count the people matching a set of People Search " +
            "filters without returning any profile. Takes exactly the " +
            "filters of `reversecontact#v2/search/people`, without " +
            "`cursor` or `perPage`, and returns `data.count`. Use it to " +
            "size a market, compare segments, or tighten filters before " +
            "running the paid search. Free.",
        docsUrl: "https://docs.reversecontact.com/endpoints/search-people",
        categories: ["people-enrichment"],
        notes: [
            "At least one filter is required (422 `NO_FILTER_PROVIDED`).",
        ],
    },
    request: { method: "POST", path: "/v2/search/people/count" },
    input: { schema: { body: zSearchPeopleCountBody } },
    timeouts: { requestMs: 40_000, runMs: 45_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
