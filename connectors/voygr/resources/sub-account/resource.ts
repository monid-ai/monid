import { z } from "zod";
import { defineResource, resourceUsage } from "@shared/core";

/**
 * voygr/sub-account: a VOYGR partner sub-account, one per Monid
 * workspace. VOYGR limits request rates, concurrent calls and calls per
 * day per sub-account and reports usage per sub-account, so each
 * workspace gets its own limits (the `ensure` in schema/sub-account.ts
 * creates it on first use). Credits are not per sub-account: they draw on
 * the partner balance. Free: VOYGR charges the calls made under it, not
 * the sub-account itself.
 *
 * `externalId` is the sub-account id (`sub_<32 hex>`), sent back as the
 * `X-Sub-Account` header on every request.
 */
export default defineResource({
    slug: "sub-account",
    meta: {
        displayName: "Sub-account",
        summary: "This workspace's own VOYGR sub-account, with its own limits.",
        description:
            "A VOYGR sub-account that belongs to this workspace, with its " +
            "own limits on request rate, calls at once and calls per day, " +
            "and its own usage report. The connector creates it on first " +
            "use. It is free to hold.",
        docsUrl: "https://api.voygr.tech/docs",
    },
    data: z.strictObject({
        /** The reference the sub-account was created under:
         *  `monid:<workspace scope key>`. */
        reference: z.string(),
    }),
    usage: resourceUsage.free(),
    lifecycle: {
        /**
         * verify: `GET /v1/sub-accounts/{id}`. 200 is active whatever the
         * status field says: a suspended sub-account still exists, and an
         * inactive verdict would release the row and create a second
         * sub-account for the same workspace. 404 is the only inactive
         * verdict; any other answer throws (retriable), never a guess.
         */
        verify: async ({ data, utils }) => {
            const res = await utils.http({
                method: "GET",
                path: "/v1/sub-accounts/" + data.resource.externalId,
            });
            if (res.status === 200) return { active: true };
            if (res.status === 404) {
                return { active: false, inactiveReason: "http_404" };
            }
            throw new Error(
                "voygr sub-account verify failed with HTTP " + res.status,
            );
        },
        /** release: VOYGR has no delete; the sub-account just stops being
         *  tracked, so there is nothing to call. */
        release: () => Promise.resolve({ released: true }),
    },
});
