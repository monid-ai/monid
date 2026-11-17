import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("podwise#episodes/status done: free", async () => {
    const unit = await testSealedUnit("podwise#episodes/status");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { seq: "9480205" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        success: true,
        result: { status: "done", progress: 100 },
    });
});

Deno.test("podwise#episodes/status not_requested: a 200, not an error", async () => {
    const unit = await testSealedUnit("podwise#episodes/status");
    const fixture = await loadFixture(`${fixturesDir}not-requested.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { seq: "9354876" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        success: true,
        result: { status: "not_requested", progress: null },
    });
});

Deno.test({
    name: "podwise#episodes/status live (gated on PODWISE_API_KEY)",
    ignore: liveSkip("podwise"),
    fn: async () => {
        const unit = await testSealedUnit("podwise#episodes/status");
        const result = await runEndpoint({
            unit,
            input: { pathParams: { seq: "9480205" } },
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
