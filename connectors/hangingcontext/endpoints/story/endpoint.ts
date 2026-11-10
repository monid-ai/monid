import { defineEndpoint } from "@shared/core";
import { zHangingContextStoryPathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Hanging Context Story",
        summary: "One story in full, with its key facts and cited sources.",
        description: "One Hanging Context story in full: headline, " +
            "summary, sections, key facts, open questions, publishers, " +
            "corrections, and every cited Synorb Manifest with its title " +
            "and a link to the original source. Take date and slug from " +
            "the story URL returned by Ask, Latest Stories or Topic.",
        docsUrl: "https://hangingcontext.com/developers/",
    },
    /** PUBLIC identity: the native path carries placeholders. */
    endpoint: "/story",
    request: { method: "GET", path: "/stories/{date}/{slug}/index.json" },
    input: { schema: { pathParams: zHangingContextStoryPathParams } },
});
