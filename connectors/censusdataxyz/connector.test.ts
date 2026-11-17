import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * censusdataxyz through the compiled docs. Fixtures are SYNTHETIC, shaped
 * from censusdata.xyz/skill and the monid-services census tests.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);
const QUERY = "censusdataxyz#query";
const EXPLORE = "censusdataxyz#explore-variables";
const POVERTY = {
    queryParams: { q: "What is the poverty rate in Chicago, IL?" },
};

Deno.test("censusdataxyz#query: answers with summary and raw_data; the quota is stripped", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(QUERY),
        input: POVERTY,
        mode: "replay",
        fixture: await fixture("synthetic-query-happy"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Json>;
    assertEquals("quota" in output, false);
    assertEquals(output.success, true);
    assertEquals((output.raw_data as Json[]).length, 1);
});

Deno.test("censusdataxyz#query: an unanswerable question is 200 data with success false", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(QUERY),
        input: { queryParams: { q: "What is the best pizza?" } },
        mode: "replay",
        fixture: await fixture("synthetic-query-unanswerable"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    const output = result.output as Record<string, Json>;
    assertEquals(output.success, false);
    assertEquals(output.error_details, "Unanswerable / irrelevant");
});

Deno.test("censusdataxyz#query: an exhausted daily allowance is a 429 provider error", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(QUERY),
        input: POVERTY,
        mode: "replay",
        fixture: await fixture("synthetic-query-quota"),
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("censusdataxyz#explore-variables: lists variables; the quota is stripped", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(EXPLORE),
        input: { queryParams: { keyword: "veterans" } },
        mode: "replay",
        fixture: await fixture("synthetic-explore-happy"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Json>;
    assertEquals("quota" in output, false);
    assertEquals((output.variables as Json[]).length, 1);
});

Deno.test({
    name: "censusdataxyz#query live (gated on CENSUSDATAXYZ_API_KEY)",
    ignore: liveSkip("censusdataxyz"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(QUERY),
            input: POVERTY,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});
