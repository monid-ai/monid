import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTechSignalsQueryParams } from "./schema/inputs.ts";

/** GET /signals/tech.json — dated tech-stack changes across companies. */
export default defineEndpoint({
    meta: {
        displayName: "Bloomberry Tech Stack Changes",
        summary:
            "Companies that just adopted, dropped, upgraded or downgraded a tool.",
        description: "List recent tech-stack changes: which companies just " +
            "started using a vendor or category, stopped using it, " +
            "subscribed, unsubscribed, upgraded or downgraded — each with " +
            "the change date, a one-line description, the company's " +
            "domain, name, industry, headcount band and HQ country, and " +
            "the vendor, its category and the public record the change " +
            "was detected from. Pick ONE of `vendor_name` or `category` " +
            "(or 'all'), or pass `domain` to see one company's own " +
            "changes. Narrow with new_only / churn_only, a date range, " +
            "and company filters (size, industry, country, region). This " +
            "is the timing signal: a company on this list adopted (or " +
            "dropped) the tool on `change_date`. For the full CURRENT " +
            "customer list of a vendor use /accounts/tech.json; for one " +
            "company's whole stack use /enrichments/tech.json. Pages of " +
            "up to 20 via `next_token`; 10 credits per change returned.",
        docsUrl: "https://docs.bloomberry.com/reference/get_signals-tech-json",
        categories: ["technographics", "company-news"],
        notes: [
            "`vendor_name` and `category` are mutually exclusive: pass " +
            "exactly one. `domain` takes precedence — when it is set the " +
            "vendor selectors are ignored and the page is that company's " +
            "own changes.",
            "An unknown `vendor_name` comes back from Bloomberry as HTTP " +
            "200 with an `error` body; the connector settles it as a 422 " +
            "provider error with zero usage. Resolve exact spellings via " +
            "/vendors/all_vendors.json.",
        ],
    },
    request: { method: "GET", path: "/signals/tech.json" },
    // `limit` is the estimate's whole basis: the vendor default (20, the
    // documented maximum) is materialized at the binding (design D25 —
    // the mirror stays optional), so the promise is deducible, never
    // defaulted inside the fn.
    input: {
        schema: {
            queryParams: zTechSignalsQueryParams.extend({
                limit: zTechSignalsQueryParams.shape.limit.unwrap().default(
                    20,
                ),
            }),
        },
    },
    usage: {
        /** PER CHANGE: "10 credits per tech stack change" (published rate
         *  card), whatever the change type. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "tech stack changes",
            consumes: { credit: "default", amount: 10 },
        },
        /** The caller-stated (or defaulted) page size IS the promise. */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.queryParams.limit },
        }),
        /** Settle on what came back over the wire: the `signals` array. An
         *  empty page (or a vendor error, which never reaches here) bills
         *  nothing. */
        evidence: ({ data, utils }) => ({
            counts: {
                "RESULT": utils.json.optionalLen(data.output, "$.signals") ??
                    0,
            },
        }),
    },
});
