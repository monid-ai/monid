import { defineProvider, presets } from "@shared/core";
import { z } from "zod";

/**
 * Xquik (xquik.com), an X (Twitter) data API. Seven synchronous reads
 * against `https://xquik.com/api/v1`, auth `x-api-key`.
 *
 * BILLING. Xquik meters one pool of credits per account. Each returned
 * tweet, profile or follower draws 1 credit, a lookup draws 1, and an
 * error draws nothing (https://xquik.com/openapi.yaml, 2026-11-15). The
 * pool is those credits. Their dollar price depends on the account's plan,
 * so it is the broker card's job, not the doc's.
 *
 * The actual charge is the vendor claim (design D27). Every answer carries
 * `X-Xquik-Credits-Charged`, the credits that request took. It reads 0 for
 * a page a filter empties and for a page sent again with the same cursor,
 * which Xquik serves again for free for 10 minutes. A lifecycle relay (the
 * cloro pattern) carries the header into state for usage.consolidate. The
 * engine prunes a zero claim back to the derived fold, so each list read's
 * evidence also counts 0 rows when the header reads 0 (the ahrefs
 * pattern). A missing or malformed header falls back to the rate card.
 */
export default defineProvider({
    name: "xquik",
    meta: {
        displayName: "Xquik",
        summary: "X (Twitter) data API for tweets, profiles & followers.",
        description: "Xquik is the world's fastest & cheapest X (Twitter) " +
            "data API. It has the most complete X data. Search tweets with " +
            "X search operators & filters. Read a tweet, a profile, a " +
            "timeline or a follower list. Xquik bills only delivered, unique rows that " +
            "match your filters, & it never pads rows. Every returned " +
            "tweet, profile or follower costs 1 Xquik credit.",
        homepageUrl: "https://xquik.com",
        docsUrl: "https://docs.xquik.com",
        categories: ["twitter"],
        notes: [
            "Each returned tweet, profile or follower costs 1 Xquik " +
            "credit, & a lookup costs 1. A page a filter empties costs " +
            "nothing.",
            "An error answers {error, message} & costs nothing. A missing " +
            "or suspended account answers 404 user_not_found.",
            "Lists page with next_cursor. Send it as cursor with the same " +
            "filters for the next page. A page sent again with the same " +
            "cursor within 10 minutes costs nothing.",
            "The X-Xquik-Credits-Charged response header settles each " +
            "bill. Without it, settlement falls back to the rate card.",
            "A query parameter outside an endpoint's schema fails " +
            "INVALID_INPUT, since Xquik prices some filters above the " +
            "read price.",
            "Reads run on Xquik's infrastructure & return public X data. " +
            "Xquik is an independent service, not affiliated with X Corp.",
        ],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://xquik.com/api/v1" },
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    lifecycle: {
        state: z.strictObject({
            creditsCharged: z.number().int().nonnegative().optional(),
        }),
        start: async ({ utils }) => {
            const response = await utils.request();
            const raw = response.headers["x-xquik-credits-charged"];
            const parsed = raw !== undefined && /^\d+$/.test(raw.trim())
                ? Number(raw)
                : undefined;
            const creditsCharged =
                parsed !== undefined && Number.isSafeInteger(parsed)
                    ? parsed
                    : undefined;
            return {
                kind: "COMPLETED",
                httpStatus: response.status,
                output: response.body,
                ...(creditsCharged !== undefined
                    ? { state: { data: { creditsCharged } } }
                    : {}),
            };
        },
    },
    usage: {
        credits: {
            default: {
                label: "Xquik credits",
                description: "The account's credit balance. Each " +
                    "returned tweet, profile or follower draws 1, & each " +
                    "lookup draws 1.",
            },
        },
        consolidate: ({ data, utils }) => {
            const creditsCharged = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.creditsCharged",
            );
            return {
                credits: {
                    ...(typeof creditsCharged === "number"
                        ? { default: creditsCharged }
                        : {}),
                },
            };
        },
    },
});
