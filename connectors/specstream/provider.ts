import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * SpecStream (specstream.ai): the live web data engine for teams and agents.
 * One host (`https://api.specstream.ai`), one Bearer API key, six endpoints.
 *
 * Two answer in one call, each with its price on the reply (`data.price_usd`):
 *
 *   `v1/web-search`           a question -> the answer and the results read
 *   `v1/extract`              up to 20 URLs -> each page's main text
 *
 * Four carry a request for a whole table from plain words to sourced rows:
 *
 *   `v1/parse`                a request in plain words -> a reading (FREE)
 *   `v1/capacity/quotes`      a reading -> a signed quote with its maximum (FREE)
 *   `v1/capacity/executions`  the approved quote -> the run, polled to its end
 *   `v1/finds/{id}/rows`      read the rows of a find, page by page (FREE)
 *
 * In the table flow only the run spends. Reading a request and pricing it
 * never do, and a quote names the most the run can cost before anything
 * starts.
 *
 * Billing, and why it is not a per-row rate table. SpecStream charges per
 * matching row, and the rate is set by the job each row replaces: 5 cents
 * (Standard), 15 cents (Expanded) or 1 dollar (Deep), plus 5 cents for a
 * person's email and 15 cents for a phone; a row that does not match, and a
 * run that finds nothing, cost nothing (https://specstream.ai/agents.md and
 * https://specstream.ai/pricing, 2026-11-03; every quote also carries its
 * rates in `terms`). Which rate applies is decided by the quote for THIS
 * request, and the receipt does not split a charge into tier, contact and
 * refresh lines, so a tier-by-tier model here could only guess its evidence.
 * The honest meter is the one SpecStream settles on: the cents it captured.
 * The run endpoint therefore meters captured cents one for one (the
 * firecrawl#agent posture), the vendor's `commerce.amount_captured_cents` is
 * the claim that settles (design D27), and the approved maximum is the
 * estimate, the same ceiling SpecStream reserves from the account before it
 * starts.
 */
export default defineProvider({
    name: "specstream",
    meta: {
        displayName: "SpecStream",
        summary:
            "Web search with sourced answers, page reading, and sourced tables from the live web.",
        description:
            "SpecStream is the live web data engine for teams and agents. " +
            "Search answers a question from the live web in one call, " +
            "with the page behind each value, or returns the results " +
            "alone in about a second on the fast tier. Extract reads up " +
            "to 20 pages live and returns each page's main text. For a " +
            "whole table, describe the data you need in plain words and " +
            "get structured rows, every value linked to the page it came " +
            "from: read the request, get a signed quote with the most it " +
            "can cost, approve that maximum to run it, and read the rows. " +
            "A search is $0.005, or $0.001 on the fast tier, and a page " +
            "read is $0.0008. A table is priced per matching row, shown " +
            "and approved before any work runs.",
        homepageUrl: "https://specstream.ai",
        docsUrl: "https://specstream.ai/docs/api",
        categories: ["web-search", "web-scraping"],
        notes: [
            "Every response wraps its payload in `{ data }`; an error is " +
            "`{ error: { code, message } }`.",
            "Reading a request (`v1/parse`) and pricing it (`v1/capacity/quotes`) " +
            "never spend. Only `v1/capacity/executions` does, and never more " +
            "than the `confirm_max_cents` it is sent.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.specstream.ai" },
    // Reading a request can take several seconds; the run endpoint sets its own
    // long budget.
    timeouts: { requestMs: 60_000, runMs: 65_000 },
    usage: {
        /** THE credit system (design D26): SpecStream prices in dollars (and
         *  settles the same numbers in euros for euro accounts), so the pool is
         *  US dollars, like exa. */
        credits: { default: { label: "US dollars" } },
        // reads are free; `v1/web-search`, `v1/extract` and
        // `v1/capacity/executions` override with their metered models
        model: { kind: UsageModelKind.FREE },
    },
    output: {
        /** SpecStream's error envelope is `{ error: { code, message, details? } }`.
         *  Vendor non-2xx is DATA, zero-billed by the engine. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "SpecStream API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
