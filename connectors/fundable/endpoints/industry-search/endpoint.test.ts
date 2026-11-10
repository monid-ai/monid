import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "fundable#industry/search";

Deno.test("fundable#industry/search happy (synthetic): free — the vendor's own 0 prunes, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        // the fixture URL proves the wire form: ?name=fintech
        input: { queryParams: { name: "fintech" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // FREE model (D25/D26): nothing folds, nothing is evidenced; the
    // vendor's credits_used 0 is a present zero that prunes to an empty
    // claim — a nonzero claim here would be FN_CONTRACT
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals((output.data.industries as unknown[]).length, 2);
    assertEquals(output.meta, {});
});

Deno.test("fundable#industry/search provider error (synthetic 401): data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { name: "fintech" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, Record<string, unknown>>).error.code,
        "UNAUTHORIZED",
    );
});

Deno.test("fundable#industry/search: an empty name is rejected before the wire; a real name passes", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { name: "" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { queryParams: { name: "fintech" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "fundable#industry/search live (gated on FUNDABLE_API_KEY)",
    ignore: liveSkip("fundable"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { name: "fintech", type: "INDUSTRY" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        // shape, not amounts: the vendor envelope carries a data object
        const body = result.output as Record<string, unknown>;
        assert(
            body.data !== null && typeof body.data === "object" &&
                !Array.isArray(body.data),
            JSON.stringify(result.output),
        );
    },
});
