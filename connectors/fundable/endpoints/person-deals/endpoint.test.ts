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
const ID = "fundable#person/deals";

Deno.test("fundable#person/deals happy (synthetic): rows are the unit; the vendor's credits_used claim wins; account fields absorbed", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                id: "5b6c7d8e-1f2a-4b3c-8d4e-5f6a7b8c9d0e",
                page_size: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // D27 claim-wins: meta.credits_used (2) IS usage.credits; the fold
    // (2 rows × 1 credit) agrees, so no mismatch key settles
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { RESULT: 2 },
    });
    // the meter and the account-level fields leave the payload; the
    // pagination keys the caller needs stay
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals(output.meta, { total_count: 9, page: 0, page_size: 2 });
    assertEquals((output.data.deals as unknown[]).length, 2);
});

Deno.test("fundable#person/deals empty (synthetic): zero rows bill nothing", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                id: "5b6c7d8e-1f2a-4b3c-8d4e-5f6a7b8c9d0e",
                page_size: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // the vendor's present 0 prunes to an empty claim (D27); the derived
    // fold of 0 rows draws nothing, evidence still says 0 rows
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test("fundable#person/deals provider error (synthetic 404): data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { linkedin: "nobody", page_size: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, Record<string, unknown>>).error.code,
        "PERSON_NOT_FOUND",
    );
});

Deno.test("fundable#person/deals: page_size is REQUIRED and capped at 100 by the binding", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const rejected: Record<string, Json>[] = [
        // the estimate's whole basis (D25)
        { id: "5b6c7d8e-1f2a-4b3c-8d4e-5f6a7b8c9d0e" },
        // platform cap (upstream allows 500)
        { id: "5b6c7d8e-1f2a-4b3c-8d4e-5f6a7b8c9d0e", page_size: 101 },
        { id: "5b6c7d8e-1f2a-4b3c-8d4e-5f6a7b8c9d0e", page_size: 0 },
    ];
    for (const queryParams of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(queryParams),
        );
    }
});

Deno.test({
    name: "fundable#person/deals live (gated on FUNDABLE_API_KEY)",
    ignore: liveSkip("fundable"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    linkedin: "https://www.linkedin.com/in/reidhoffman",
                    page_size: 2,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: the vendor claim is the credits truth
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
        const output = result.output as Record<string, Record<string, unknown>>;
        assertEquals("credits_used" in output.meta, false);
        // shape, not amounts: the vendor envelope carries a data object
        const body = result.output as Record<string, unknown>;
        assert(
            body.data !== null && typeof body.data === "object" &&
                !Array.isArray(body.data),
            JSON.stringify(result.output),
        );
    },
});
