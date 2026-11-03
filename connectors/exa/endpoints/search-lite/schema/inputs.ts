import { z } from "zod";
import { zHighlights, zText } from "../../../schema/contents-options.ts";
import { zExaSearchBody } from "../../../schema/search-body.ts";

/**
 * Exa /search with `type: "lite"` — the vendor's reduced parameter set.
 * Lite rejects every other documented search parameter (outputSchema,
 * systemPrompt, stream, contents.summary, contents.maxAgeHours, …) with a
 * 400, so the mirror carries only what lite accepts. Field definitions are
 * picked from the /search mirror so the two never drift apart. `type` is
 * absent: the endpoint pins it in toRequest.
 */
export const zExaLiteContents = z.object({
    text: zText.optional(),
    highlights: zHighlights.optional(),
});

export const zExaLiteSearchBody = zExaSearchBody.pick({
    query: true,
    numResults: true,
    category: true,
    includeDomains: true,
    excludeDomains: true,
    startPublishedDate: true,
    endPublishedDate: true,
    userLocation: true,
    moderation: true,
}).extend({
    contents: zExaLiteContents.optional(),
});
