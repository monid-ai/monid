import { defineEndpoint } from "@shared/core";
import { zQuoteBody } from "./schema/inputs.ts";

/** POST /v1/capacity/quotes: price a reading before anything runs. */
export default defineEndpoint({
    meta: {
        displayName: "SpecStream Quote",
        summary:
            "Get a signed quote, with the most a find can cost, for a reading.",
        description:
            "Price the reading returned by `specstream#v1/parse`. The quote " +
            "names `maximum_cents`, the most the run can cost, the `terms` " +
            "(the rate per matching result, plus the extra for a person's " +
            "email or phone), and when it expires (30 minutes). Show " +
            "`maximum_cents` to your person and get their approval, unless " +
            "they delegated it to you explicitly, then pass `quote_id`, " +
            "`quote_hash` and `maximum_cents` to " +
            "`specstream#v1/capacity/executions`. Free: pricing never " +
            "spends. Results the account already owns are never charged " +
            "again.",
        docsUrl: "https://specstream.ai/docs/billing",
        categories: ["web-search"],
        notes: [
            "A quote expires after 30 minutes; an expired quote or a " +
            "changed reading needs a new quote.",
            "Check `can_authorize` before approving; when it is false the " +
            "quote cannot be run.",
        ],
    },
    request: { method: "POST", path: "/v1/capacity/quotes" },
    input: {
        schema: {
            // vendor-documented default (25), applied at the binding (D25)
            body: zQuoteBody.extend({
                requested_units: zQuoteBody.shape.requested_units.unwrap()
                    .default(25),
            }),
        },
    },
});
