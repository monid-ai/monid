import { defineEndpoint } from "@shared/core";

/**
 * `GET /campaigns` — the entry point. Everything else in this connector
 * needs a program id, and this is where one comes from. No input at all.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Programs",
        summary: "List the team's referral and affiliate programs.",
        description: "List every program on the team the API key belongs " +
            "to, newest first, with the id each other GrowSurf endpoint " +
            "needs. Each row carries the program's `name`, its `type` " +
            "(`REFERRAL` or `AFFILIATE` — that decides which endpoints " +
            "apply), its `status` (`DRAFT`, `IN_PROGRESS`, `PAUSED` or " +
            "`COMPLETE`), its `currencyISO`, running `participantCount`, " +
            "`referralCount`, `impressionCount`, `inviteCount` and " +
            "`winnerCount` totals, and the reward configuration under " +
            "`rewards` (for an affiliate program that includes the " +
            "`commissionStructure` — percent or fixed, the hold duration, " +
            "and whether commissions need approval). Deleted programs are " +
            "not returned. Start here when you do not already hold a " +
            "program id; take the program details alone from " +
            "growsurf#campaign/{id}.",
        docsUrl: "https://docs.growsurf.com/developer-tools/rest-api/" +
            "api-reference#get-campaigns",
        categories: ["referrals"],
    },
    request: { method: "GET", path: "/campaigns" },
});
