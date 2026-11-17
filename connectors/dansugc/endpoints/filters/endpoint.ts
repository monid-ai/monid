import { defineEndpoint, UsageModelKind } from "@shared/core";

/** GET /broll/filters — the filter vocabulary for clip search. Free. */
export default defineEndpoint({
    meta: {
        displayName: "List UGC Clip Filters",
        summary: "List the values clip search accepts for each filter.",
        description: "List the values dansugc#broll accepts for each " +
            "filter — emotions, genders, age ranges, locations, hair " +
            "colors and outfits — so a search can be narrowed without " +
            "guessing spellings. Free.",
        docsUrl: "https://dansugc.com/docs#tag/b-roll/GET/broll/filters",
        categories: ["stock-media"],
    },
    request: { method: "GET", path: "/broll/filters" },
    usage: { model: { kind: UsageModelKind.FREE } },
});
