import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "fundable#deals/{id}";

Deno.test("fundable#deals/{id} happy (synthetic): flat 1 credit; meter absorbed", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        // the fixture URL proves the wire form
        input: { pathParams: { id: "cca72384-d735-42f8-99d6-b3e14179c4c1" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // flat model: the engine appends the CALL line; the vendor's own 1
    // credit is the claim and agrees with the pinned draw
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals(
        (output.data.deal as Record<string, unknown>).round_type,
        "SERIES_B",
    );
    // credits_used was the only meta key — pluck leaves an empty meta
    assertEquals(output.meta, {});
});

Deno.test("fundable#deals/{id} provider error (synthetic 404): data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "90a4d2e0-7b3c-4e5f-9a1b-2c3d4e5f6a79" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, Record<string, unknown>>).error.code,
        "DEAL_NOT_FOUND",
    );
});

Deno.test("fundable#deals/{id}: a non-UUID id is rejected before the wire", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { id: "not-a-uuid" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: "fundable#deals/{id} live (gated on FUNDABLE_API_KEY)",
    ignore: liveSkip("fundable"),
    fn: async () => {
        // resolve a deal that exists live (the replay UUID is synthetic):
        // one row from the deals search, then fetch it by id
        const search = await runEndpoint({
            unit: await testSealedUnit("fundable#deals"),
            input: { body: { page_size: 1 } },
            mode: "live",
        });
        assertEquals(
            search.isProviderError,
            false,
            JSON.stringify(search.output),
        );
        const deals = (search.output as Record<string, Record<string, unknown>>)
            .data.deals as Record<string, unknown>[];
        assert(deals.length > 0, "live deals search returned no rows");
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { pathParams: { id: String(deals[0].id) } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: one CALL line, numeric
        assertEquals(Object.keys(result.usage.evidence), ["CALL"]);
        assertEquals(typeof result.usage.evidence.CALL, "number");
        // shape, not amounts: the vendor envelope carries a data object
        const body = result.output as Record<string, unknown>;
        assert(
            body.data !== null && typeof body.data === "object" &&
                !Array.isArray(body.data),
            JSON.stringify(result.output),
        );
    },
});
