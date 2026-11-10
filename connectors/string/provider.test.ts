import { assert, assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

/**
 * String's PUBLISHED Growth-tier rates, in US dollars —
 * https://portal.usestring.ai/docs/get-started/pricing (retrieved
 * 2026-10-24): a search is $1.00 per 1,000, and `aiOverview` costs one
 * search more; a fetch is $0.20, $2.00, $1.00 or $4.00 per 1,000 by the
 * billed request type the response names, or the search rate for a
 * Google results URL answered through Search. A request with a body can
 * only take the two request-based types. String sends no billing
 * receipt, so the derived fold is the settled answer and this table is
 * the only thing standing between a typo and a wrong bill. Written as
 * LITERALS on purpose: deriving them from each doc's own model would make
 * the test a tautology. A new endpoint or billed line must state its row
 * here.
 */
const RATE: Record<string, Record<string, number>> = {
    "string#search": { search: 0.001, ai_overview: 0.001 },
    "string#fetch": {
        request_standard: 0.0002,
        request_premium: 0.002,
        browser_standard: 0.001,
        browser_premium: 0.004,
        search: 0.001,
    },
    "string#request": {
        request_standard: 0.0002,
        request_premium: 0.002,
    },
};

Deno.test("string: the literal rate table covers exactly the compiled endpoints", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("string#"))
        .sort();
    assertEquals(ids, Object.keys(RATE).sort());
});

Deno.test("string: every billed line consumes its published rate", async () => {
    const bundle = await testBundle();
    for (const [id, rates] of Object.entries(RATE)) {
        const model = bundle.endpoints[id].usage.model;
        assert(model.kind === "COMPOSITE", id);
        assertEquals(
            Object.fromEntries(
                Object.entries(model.components).map((
                    [line, component],
                ) => [line, component.consumes.amount]),
            ),
            rates,
            id,
        );
    }
});
