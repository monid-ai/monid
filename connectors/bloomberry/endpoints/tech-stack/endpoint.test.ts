import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const ID = "bloomberry#enrichments/tech.json";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("bloomberry: provider-wide fns are shared by every endpoint", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("bloomberry#")
    );
    assertEquals(ids.sort(), [
        "bloomberry#accounts/tech.json",
        "bloomberry#enrichments/tech.json",
        "bloomberry#signals/tech.json",
        "bloomberry#vendors/all_vendors.json",
    ]);
    const first = bundle.endpoints[ids[0]];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        // ONE query-param auth inject, ONE array→';' hook, ONE in-band
        // error verdict — all provider-wide facts (leaf-wise fallback)
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key);
        assertEquals(
            doc.input.toRequest?.$fn.key,
            first.input.toRequest?.$fn.key,
        );
        assertEquals(
            doc.lifecycle?.start?.$fn.key,
            first.lifecycle?.start?.$fn.key,
        );
        // no vendor meter in any response ⇒ no consolidate anywhere
        assertEquals(doc.usage.consolidate, undefined);
    }
    // the FREE catalog carries the compiler-synthesized quantities fns
    // (the one lawful `{counts: {}}`)
    for (const id of ["bloomberry#vendors/all_vendors.json"]) {
        const doc = bundle.endpoints[id];
        assertEquals(
            bundle.fnTable[doc.usage.estimate.$fn.key].provenance,
            "core#usage.synthesizedEmpty",
        );
        assertEquals(
            bundle.fnTable[doc.usage.evidence.$fn.key].provenance,
            "core#usage.synthesizedEmpty",
        );
    }
});

Deno.test(`${ID} happy (recorded): one credit for the enriched company, vendors array relayed`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { domain: "unifygtm.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // one enriched company × 1 credit
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as { vendors: { vendor_name: string }[] };
    assertEquals(output.vendors.length, 2);
    assertEquals(output.vendors[0].vendor_name, "AWS Route 53");
});

Deno.test(`${ID} estimate: one credit is promised up front`, async () => {
    const unit = await testSealedUnit(ID);
    const usage = await estimateEndpoint(unit, {
        queryParams: { domain: "unifygtm.com" },
    });
    assertEquals(usage, { credits: { default: 1 }, evidence: { RESULT: 1 } });
});

Deno.test(`${ID} empty (recorded): unknown domain is 200 with no vendors — bills nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}empty.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { domain: "no-such-company-zzz-qq.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // zero vendors ⇒ zero enriched companies ⇒ the line prunes
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
    assertEquals((result.output as { vendors: unknown[] }).vendors, []);
});

Deno.test(`${ID} category (recorded): the category filter reaches the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}category.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                domain: "unifygtm.com",
                category: "managed DNS provider",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    const output = result.output as { vendors: { vendor_category: string }[] };
    assertEquals(output.vendors.length, 1);
    assertEquals(output.vendors[0].vendor_category, "managed DNS provider");
});

Deno.test(`${ID} list_mode (recorded): the flat name list still counts as one enriched company`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}list-mode.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { domain: "unifygtm.com", list_mode: true } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    // list_mode returns names only (no categories or dates)
    const output = result.output as { vendors: string[] };
    assertEquals(output.vendors, ["AWS Route 53", "Metabase"]);
});

Deno.test(`${ID}: domain is required`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { list_mode: false } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test(`${ID} provider error (recorded 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { domain: "unifygtm.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name:
        `${ID} live (gated on BLOOMBERRY_CREDENTIALS_API_KEY; spends 1 credit)`,
    ignore: liveSkip("bloomberry"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { domain: "unifygtm.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape only: a live domain may legitimately enrich to nothing
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
    },
});
