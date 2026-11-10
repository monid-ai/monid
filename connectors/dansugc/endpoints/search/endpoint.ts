import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSearchQueryParams } from "./schema/inputs.ts";

/** GET /broll — search the real-human UGC clip library. Free. */
export default defineEndpoint({
    meta: {
        displayName: "Search UGC Reaction Clips",
        summary: "Search real-human UGC reaction clips by keyword or by " +
            "describing the shot.",
        description: "Search DansUGC's library of real-human UGC reaction " +
            "clips (filmed by real creators, never AI). Use `search` for " +
            "keywords over title, tags and description, or " +
            "`semantic_search` to describe the shot in plain words " +
            '("woman laughing at her phone in bed") — use one, not both. ' +
            "Narrow with emotion, gender, age_range, location, hair_color, " +
            "outfit and media_type (values from dansugc#broll/filters), " +
            "and page with page/limit (max 100). Each result carries its " +
            "id, title, description, duration, a watermarked preview_url " +
            "and thumbnail, and `price` in DansUGC credits for this " +
            "account. Free — searching never spends credits. To get the " +
            "full-quality file, license it with dansugc#broll/purchase.",
        docsUrl: "https://dansugc.com/docs#tag/b-roll/GET/broll",
        categories: ["stock-media", "video-search"],
    },
    request: { method: "GET", path: "/broll" },
    input: { schema: { queryParams: zSearchQueryParams } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
