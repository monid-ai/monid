import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPurchaseBody } from "./schema/inputs.ts";

/**
 * POST /broll/purchase — license clips and get their download links.
 *
 * TWO-STEP CONFIRM (vendor contract): a call without `expected_total_cents`
 * (or with a stale one) charges nothing and answers 409
 * `{requiresConfirmation, expectedTotalCents}` — error-as-data, zero usage;
 * the caller repeats the call with that value to buy. Clips the account
 * already owns come back under `already_purchased` and are not charged —
 * except on a platform key flagged as a reseller (Monid's), where every
 * purchase is a fresh, charged license for the end customer.
 *
 * BILLING: metered in DansUGC credits. Monid's platform key is a DansUGC
 * reseller key: every clip, video or image, is a flat 13 credits and is
 * charged on every purchase (no plan discount, sale or free tier). An
 * ordinary DansUGC key lists 11 per video and 8 per image instead
 * (dansugc.com/api/pricing/settings
 * `broll.videoListCents` / `imageListCents`), lowered by any live sale —
 * so the meter counts CREDITS, not clips: evidence sums each fresh
 * purchase's `price_paid`, and the vendor's own `total_amount` is the
 * claim. The estimate is the worst case: every id a fresh video at list.
 */
export default defineEndpoint({
    meta: {
        displayName: "License UGC Clips",
        summary: "License real-human UGC clips and get full-quality " +
            "download links.",
        description: "License 1–50 clips (ids from dansugc#broll) for " +
            "commercial use in ads and organic posts, and get each clip's " +
            "full-quality, unwatermarked download_url. The link is signed " +
            "and valid for about an hour, so download the file right away. " +
            "Monid's platform key is a DansUGC reseller key: every purchase " +
            "is a new, charged license, even for a clip bought before (an " +
            "ordinary DansUGC key gets an owned clip back free). Two " +
            "steps: call with just `video_ids` to get the exact total — " +
            "that answers 409 with `expected_total_cents` and charges " +
            "nothing — then call again with `expected_total_cents` set to " +
            "that value to buy. Each clip, video or image, is 13 DansUGC " +
            "credits through Monid.",
        docsUrl: "https://dansugc.com/docs#tag/b-roll/POST/broll/purchase",
        categories: ["stock-media"],
        notes: [
            "The 409 confirmation step is free and is the way to quote a " +
            "basket before buying; a 402 means the balance cannot cover " +
            "it. Both settle with zero usage.",
        ],
    },
    request: { method: "POST", path: "/broll/purchase" },
    input: { schema: { body: zPurchaseBody } },
    usage: {
        /** 1 per DansUGC credit charged (design D3): the per-clip price
         *  varies by media type and live sale, so credits are the unit. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "credits charged",
            description: "DansUGC credits charged for freshly licensed " +
                "clips (a flat 13 per clip on the platform key; already-owned " +
                "clips are free)",
            consumes: { credit: "default", amount: 1 },
        },
        /** Every id is a fresh clip at the platform key's flat 13 credits
         *  price (typed read of the validated input — design D25). */
        estimate: ({ data }) => ({
            counts: { CREDIT: data.input.body.video_ids.length * 13 },
        }),
        /** Sum of `price_paid` over this call's fresh purchases; owned
         *  clips (`already_purchased`) carry no price. */
        evidence: ({ data, utils }) => {
            const rows = utils.json.optionalGet(data.output, "$.purchases");
            const paid = (Array.isArray(rows) ? rows : [])
                .map((row) =>
                    typeof row === "object" && row !== null &&
                        !Array.isArray(row) &&
                        typeof row.price_paid === "number"
                        ? row.price_paid
                        : 0
                )
                .reduce((sum, value) => sum + value, 0);
            return { counts: { CREDIT: paid } };
        },
        /** The vendor's own charge, `total_amount` (credits), is the
         *  CLAIM. Absent → the derived fold settles, never a silent zero. */
        consolidate: ({ data, utils }) => {
            const total = utils.json.optionalGet(data.output, "$.total_amount");
            return {
                credits: {
                    ...(typeof total === "number" ? { default: total } : {}),
                },
            };
        },
    },
});
