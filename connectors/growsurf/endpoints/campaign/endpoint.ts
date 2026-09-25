import { defineEndpoint } from "@shared/core";
import { zCampaignPathParams } from "../../schema/common.ts";

/**
 * `GET /campaign/{id}` — one program. Same object the list returns, fetched
 * by id when the caller already holds one.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Program",
        summary: "Read one referral or affiliate program by id.",
        description: "Read a single program by id: its `name`, `type` " +
            "(`REFERRAL` or `AFFILIATE`), `status`, `currencyISO`, the " +
            "running `participantCount`, `referralCount`, " +
            "`impressionCount`, `inviteCount` and `winnerCount` totals, " +
            "and the full reward configuration under `rewards`. For an " +
            "affiliate program each reward carries its " +
            "`commissionStructure` — `PERCENT` or a fixed `amount`, the " +
            "`holdDuration` before a commission can be paid, whether " +
            "`approvalRequired` is set, and any introductory rate — which " +
            "is what tells you how a recorded sale will be commissioned. " +
            "Use growsurf#campaigns when you do not yet have the id.",
        docsUrl: "https://docs.growsurf.com/developer-tools/rest-api/" +
            "api-reference#get-campaign-id",
        categories: ["referrals"],
    },
    request: { method: "GET", path: "/campaign/{id}" },
    input: { schema: { pathParams: zCampaignPathParams } },
});
