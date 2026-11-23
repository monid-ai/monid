import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("datawebot#sites: free, returns the shop's capabilities", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("datawebot#sites"),
        input: { queryParams: { site: "walmart.com" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-sites.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals(output.search.available, true);
});

Deno.test({
    name: "datawebot#sites live (gated on DATAWEBOT_API_KEY)",
    ignore: liveSkip("datawebot"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("datawebot#sites"),
            input: { queryParams: { site: "walmart.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
