import { z } from "zod";

/** GET /n/{topic}/index.json path params — the vendor mirror
 *  (https://hangingcontext.com/openapi.json, 2026-10-24). The vendor
 *  documents the slug shape, not a fixed list: the live ids are the
 *  `newsrooms` in /editions/latest.json. */
export const zHangingContextTopicPathParams = z.object({
    topic: z.string().regex(/^[a-z0-9-]+$/).describe(
        "Topic slug, from the `id` of each entry in `newsrooms` of " +
            "Hanging Context Latest Stories. On 2026-10-24: " +
            "artificial-intelligence, research-science, finance-investing, " +
            "business-podcasts, health-biotech, sports, federal-government, " +
            "state-government, energy-climate, culture-media.",
    ),
}).strict();
