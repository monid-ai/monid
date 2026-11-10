import { defineEndpoint, UsageModelKind } from "@shared/core";

/** GET /v1/filters/list — the list-generation filter schema. Free; takes no
 *  parameters. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Filters List",
        summary: "Every filter key accepted by company list generation. Free.",
        description: "List every filter accepted by Akta's company list " +
            "generation: each key, the shape its value must take, a " +
            "description, and whether its allowed values must be looked up " +
            "with the Filter Options endpoint or supplied directly. Use it " +
            "to translate a natural-language screening request into valid " +
            "'filters' for list generation. Free — consumes no credits.",
        docsUrl: "https://agent-docs.akta.pro/api-reference/filters-list",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/v1/filters/list/" },
    usage: { model: { kind: UsageModelKind.FREE } },
});
