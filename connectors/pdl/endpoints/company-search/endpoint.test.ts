import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "pdl#v5/company/search";

Deno.test("pdl#v5/company/search happy (synthetic): each record is one company credit; no vendor claim, the fold settles on the company_search pool", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                sql: "SELECT * FROM company WHERE industry='computer software'",
                size: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // no consolidate ⇒ no claim ⇒ the DERIVED fold is the bill:
    // 2 records × 1 company_search credit (zUsage is strict — no mismatch
    // key), and nothing drains the person pools
    assertEquals(result.usage, {
        credits: { company_search: 2 },
        evidence: { RESULT: 2 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals((output.data as unknown[]).length, 2);
    // nothing is stripped — the raw REST body has no billing field
    assertEquals(output.total, 5821);
    assertEquals(output.scroll_token, "NEXT_PAGE_TOKEN");
});

Deno.test("pdl#v5/company/search empty (synthetic): a 200 with no records bills nothing", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                sql: "SELECT * FROM company WHERE industry='zzzz-no-such-industry'",
                size: 1,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test("pdl#v5/company/search provider error (synthetic 400): data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { sql: "SELECT * FROM company WHERE", size: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, Record<string, unknown>>).error.type,
        "invalid_request_error",
    );
});

Deno.test("pdl#v5/company/search: size REQUIRED; query XOR sql survives as two strict variants; no person-only fields", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const sql = "SELECT * FROM company WHERE industry='x'";
    const rejected: Json[] = [
        // the primary limiting knob is the estimate's whole basis (D25)
        { sql },
        // vendor bounds 1-100
        { sql, size: 101 },
        { sql, size: 0 },
        // BOTH query and sql — fails every strict variant
        { query: { term: { industry: "x" } }, sql, size: 1 },
        // NEITHER — no variant matches
        { size: 1 },
        // company search has no dataset (a person-search field)
        { sql, size: 1, dataset: "all" },
        // unknown key (.strict() survives compilation)
        { sql, size: 1, bogus: 1 },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    // the near-miss positive: the OTHER variant (query) with size 2 passes
    // validation and replays (the fixture matches by method + url only)
    const ok = await runEndpoint({
        unit,
        input: {
            body: {
                query: { bool: { must: [{ term: { industry: "x" } }] } },
                size: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test({
    name: "pdl#v5/company/search live (gated on PDL_API_KEY)",
    ignore: liveSkip("pdl"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    sql: "SELECT * FROM company WHERE website='stripe.com'",
                    size: 1,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
        // shape, not amounts: the records ride a data array
        assert(
            Array.isArray((result.output as Record<string, unknown>).data),
            JSON.stringify(result.output),
        );
    },
});
