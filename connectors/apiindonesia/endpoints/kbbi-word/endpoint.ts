import { defineEndpoint } from "@shared/core";
import { zKbbiWordPathParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/kbbi/word/{word}. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "KBBI Dictionary Lookup",
        summary: "Look up an Indonesian word in the KBBI dictionary.",
        description:
            "Return every KBBI (Kamus Besar Bahasa Indonesia) entry for one " +
            "Indonesian word: syllabification, word class, numbered senses, idioms " +
            "and derived forms, as the dictionary's HTML-formatted text in `arti`. " +
            "Use it to check spelling, meaning or the standard (baku) form of an " +
            "Indonesian word. A word not in KBBI answers 404, which is not billed. " +
            "Exact match only.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#kbbi",
        categories: ["government-data"],
    },
    request: { method: "GET", path: "/kbbi/word/{word}" },
    input: { schema: { pathParams: zKbbiWordPathParams } },
});
