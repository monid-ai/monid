import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const ID = "ecommerce-leads#stores/lookup";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("ecommerce-leads: compiled doc — url, bearer auth, FREE usage", async () => {
    const bundle = await testBundle();
    const doc = bundle.endpoints[ID];
    assert(doc !== undefined, "doc compiled under its derived id");
    assertEquals(
        doc.request.url,
        "https://getecommerceleads.com/api/stores/lookup",
    );
    assertEquals(doc.request.method, "GET");
    // FREE provider (D27): no vendor meter, and both quantities slots are
    // the one compiler-synthesized `() => ({counts: {}})` entry
    assertEquals(doc.usage.consolidate, undefined);
    assertEquals(doc.usage.estimate.$fn.key, doc.usage.evidence.$fn.key);
    assertEquals(
        bundle.fnTable[doc.usage.evidence.$fn.key].provenance,
        "core#usage.synthesizedEmpty",
    );
    assertEquals(
        Object.keys(bundle.endpoints).filter((id) =>
            id.startsWith("ecommerce-leads#")
        ),
        [ID],
    );
});

Deno.test("ecommerce-leads#stores/lookup happy (recorded 2026-11-18): free, body relayed verbatim", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { domain: "gymshark.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output projection: the vendor body IS the contract
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("ecommerce-leads#stores/lookup 404 (recorded 2026-11-18): no store is data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}not-found.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { domain: "no-such-store-example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("ecommerce-leads#stores/lookup 401 (recorded 2026-11-18): bad key is data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { domain: "gymshark.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("ecommerce-leads#stores/lookup rejects unknown params before the wire", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    let rejected = false;
    try {
        const result = await runEndpoint({
            unit,
            input: { queryParams: { domain: "gymshark.com", tab: "all" } },
            mode: "replay",
            fixture,
        });
        rejected = result.httpStatus !== 200;
    } catch {
        rejected = true;
    }
    assert(rejected, "strict mirror: an unknown key is INVALID_INPUT");
});

Deno.test({
    name:
        "ecommerce-leads#stores/lookup live (gated on ECOMMERCE_LEADS_API_KEY)",
    ignore: liveSkip("ecommerce-leads"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { domain: "gymshark.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assertEquals(output.basedomain, "gymshark.com");
        assert(typeof output.fields === "object", "fields object present");
    },
});
