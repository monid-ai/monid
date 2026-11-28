import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "outbound-dev#companies/filters";

const run = async (fixture: string, queryParams: Record<string, Json>) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { queryParams },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("outbound-dev#companies/filters: every filter's values, free", async () => {
    const fixture = await loadFixture(
        `${chains}synthetic-companies-filters.json`,
    );
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { queryParams: {} },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // Every list passes through untouched: nothing added, nothing dropped.
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("outbound-dev#companies/filters: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited-get.json", {});
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("outbound-dev#companies/filters: the gate rejects a misspelled key, and passes none", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-companies-filters.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { fields: "stage" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { queryParams: {} },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "outbound-dev#companies/filters live: the funding stages are listed",
    ignore: liveSkip("outbound-dev"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { queryParams: {} },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(Array.isArray(output.fundingStages), true);
    },
});
