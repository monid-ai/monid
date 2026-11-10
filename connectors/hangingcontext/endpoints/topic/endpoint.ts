import { defineEndpoint } from "@shared/core";
import { zHangingContextTopicPathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Hanging Context Topic",
        summary: "Recent stories on one topic, newest first.",
        description: "All recent Hanging Context stories for one topic, " +
            "newest first, each with headline, summary (dek), publication " +
            "time, source count, cited Manifest ids, and links to its JSON " +
            "and Markdown copies. Topics: artificial-intelligence, " +
            "research-science, finance-investing, business-podcasts, " +
            "health-biotech, sports, federal-government, state-government, " +
            "energy-climate, culture-media (the live list is in Latest " +
            "Stories). An unknown slug returns a 404. The list can be " +
            "long; filter on published_at for a time window.",
        docsUrl: "https://hangingcontext.com/developers/",
    },
    /** PUBLIC identity: the native path carries a `{topic}` placeholder,
     *  which an endpoint identity cannot. */
    endpoint: "/topic",
    request: { method: "GET", path: "/n/{topic}/index.json" },
    input: { schema: { pathParams: zHangingContextTopicPathParams } },
});
