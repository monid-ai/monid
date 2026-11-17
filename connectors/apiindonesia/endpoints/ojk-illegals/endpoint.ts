import { defineEndpoint } from "@shared/core";
import { zOjkIllegalsQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/ojk/illegals. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "OJK Illegal Investment Check",
        summary:
            "Check a name against OJK's list of illegal investment entities.",
        description:
            "Search the Indonesian Financial Services Authority (OJK / Satgas PASTI) " +
            "list of illegal investment entities by name (fuzzy match). Each entry " +
            "has the entity name, aliases, addresses, phones, emails, websites, " +
            "activity types (forex, crypto, money game and so on) and the warning " +
            "letter it came from. Use it to vet an investment app, website or company " +
            "an Indonesian user asks about. An empty list means no match on this " +
            "blacklist, not that the entity is licensed.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#ojk-invest",
        categories: ["government-data", "company-enrichment"],
    },
    request: { method: "GET", path: "/ojk/illegals" },
    input: { schema: { queryParams: zOjkIllegalsQueryParams } },
});
