import { defineEndpoint } from "@shared/core";
import {
    zCampaignPathParams,
    zPagingQueryParams,
} from "../../schema/common.ts";

/**
 * `GET /campaign/{id}/participants` — the program's roster, cursor-paged.
 *
 * The published `metadata[key]=value` filter is NOT mirrored: it is a
 * deepObject parameter and a query string has no nesting for the engine to
 * encode (see the proposal's non-goals). Everything else is the vendor's
 * own shape.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Participants",
        summary: "List a program's participants, a page at a time.",
        description: "List the people enrolled in a program, ordered " +
            "newest first and paged with an opaque `nextId` cursor: pass " +
            "the `nextId` a page returns to get the following one, and " +
            "stop when a page returns `nextId: null`. Each participant " +
            "carries their `id`, `email`, name, their own `shareUrl` " +
            "(the referral link they share), `referralCount`, " +
            "`leadCount`, `rank`, per-network `shareCount`, the ids of " +
            "the people they referred under `referrals`, any stored " +
            "`metadata`, and — in an affiliate program — `isAffiliate` " +
            "and `affiliateStatus`. Up to 100 per page, 10 by default. " +
            "Use growsurf#campaign/{id}/leaderboard instead when you want " +
            "them ranked rather than listed.",
        docsUrl: "https://docs.growsurf.com/developer-tools/rest-api/" +
            "api-reference#get-campaign-id-participants",
        categories: ["referrals"],
    },
    request: { method: "GET", path: "/campaign/{id}/participants" },
    input: {
        schema: {
            pathParams: zCampaignPathParams,
            queryParams: zPagingQueryParams,
        },
    },
});
