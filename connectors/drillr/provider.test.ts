import { assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

/**
 * drillr's REST rate card, credits per call (drillr.ai/docs/api,
 * "Per-endpoint rates", and the Billing line on each endpoint's page —
 * read 2026-11-20). Written as LITERALS on purpose: deriving them from
 * each doc's own model would make this test a tautology. A new endpoint
 * must state its row here.
 */
const RATE: Record<string, number> = {
    "drillr#balance-sheets": 0.02,
    "drillr#cash-flow-statements": 0.02,
    "drillr#company-discovery": 3,
    "drillr#earnings-calendar": 0.02,
    "drillr#events": 0.02,
    "drillr#filing-search": 0.1,
    "drillr#filings": 0.02,
    "drillr#financial-metrics-snapshot": 0.02,
    "drillr#income-statements": 0.02,
    "drillr#insider-trades": 0.02,
    "drillr#news-search": 0.2,
    "drillr#tickers": 0.02,
};

Deno.test("drillr: the literal rate table covers exactly the compiled endpoints, each a flat PER_CALL draw on the one pool", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("drillr#"))
        .sort();
    assertEquals(ids, Object.keys(RATE).sort());
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        const model = doc.usage.model as Record<string, unknown>;
        assertEquals(model.kind, "PER_CALL", id);
        assertEquals(
            model.consumes,
            { credit: "default", amount: RATE[id] },
            id,
        );
        assertEquals(
            doc.usage.credits,
            { default: { label: "drillr credits" } },
            id,
        );
    }
});

Deno.test("drillr: usage fn provenance — no vendor meter, synthesized quantities, one auth fn, no wire or output reshaping", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("drillr#"))
        .sort();
    const first = bundle.endpoints[ids[0]];
    assertEquals(
        bundle.fnTable[first.usage.estimate.$fn.key].provenance,
        "core#usage.synthesizedEmpty",
    );
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        // drillr responses carry no usage or credit field (live probe
        // 2026-11-20), so there is nothing to consolidate
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(
            doc.usage.estimate.$fn.key,
            first.usage.estimate.$fn.key,
            id,
        );
        assertEquals(
            doc.usage.evidence.$fn.key,
            first.usage.evidence.$fn.key,
            id,
        );
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
        assertEquals(
            doc.request.url.startsWith("https://gateway.drillr.ai/api/v2/"),
            true,
            id,
        );
    }
    // the slow endpoint carries its documented read timeout
    assertEquals(
        bundle.endpoints["drillr#company-discovery"].timeouts.requestMs,
        90_000,
    );
});
