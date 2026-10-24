import { defineProvider, presets } from "@shared/core";

/**
 * Prova (provaapi.com) — the funding history of one company, looked up by
 * website, name, or LinkedIn slug. One JSON-over-HTTP endpoint against
 * `https://api.provaapi.com/api/v1` (the `/api/v1` prefix survives url
 * resolution), auth `Authorization: Bearer <key>`.
 *
 * Billing is in US dollars: $0.01 per lookup whose answer is `found`;
 * `not_found`, `pending`, and errors are free. No response carries a
 * meter, so there is no `usage.consolidate` — the derived fold from the
 * endpoint's evidence is the charge.
 */
export default defineProvider({
    name: "prova",
    meta: {
        displayName: "Prova",
        summary: "Funding rounds for any company: stage, amount, date, " +
            "and investors.",
        description: "Funding history for agents — give a company's " +
            "website, name, or LinkedIn slug and get every funding round " +
            "found for it, newest first, with stage, amount, currency, " +
            "date, investors, and lead investors, plus the latest equity " +
            "round on its own. Each round says where it comes from: " +
            "`confirmed` rounds were checked against a public " +
            "announcement, `database` rounds come from a funding " +
            "database and were not checked. Companies Prova has not seen " +
            "before are looked up live.",
        homepageUrl: "https://www.provaapi.com",
        docsUrl: "https://docs.provaapi.com/guide",
        categories: ["funding-data"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.provaapi.com/api/v1" },
    timeouts: { requestMs: 30_000, runMs: 60_000, pollMs: 3_000 },
    usage: {
        /** THE credit system (design D26): Prova prices in dollars, so
         *  the pool IS dollars. */
        credits: { default: { label: "US dollars" } },
    },
});
