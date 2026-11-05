import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("pressfront#instant/{handle}: answers from the newest trace, bills $0.49", async () => {
    const unit = await testSealedUnit("pressfront#instant/{handle}");
    assertEquals(unit.doc.request.method, "GET");
    const result = await runEndpoint({
        unit,
        input: { pathParams: { handle: "quillandclaw.bsky.social" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}instant-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, { default: 0.49 });
    const out = result.output as Record<string, unknown>;
    assert(String(out.headline).startsWith("Of 187 accounts"));
    assert(
        typeof out.brief === "string" && out.brief.includes("## What happened"),
    );
});

Deno.test("pressfront#instant/{handle}: not traced today, searches, polls to the answer, bills $0.49", async () => {
    const unit = await testSealedUnit("pressfront#instant/{handle}");
    const result = await runEndpoint({
        unit,
        input: { pathParams: { handle: "newname.bsky.social" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-instant-search.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 0.49 });
    assertEquals((result.output as Record<string, unknown>).depth, "quick");
});

Deno.test("pressfront#instant/{handle}: a 404 (the demo key's other names) is zero-billed", async () => {
    const unit = await testSealedUnit("pressfront#instant/{handle}");
    const result = await runEndpoint({
        unit,
        input: { pathParams: { handle: "someoneelse.bsky.social" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}instant-none.json`),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "pressfront#instant/{handle}: live, against the public demo key",
    ignore: liveSkip("pressfront"),
    fn: async () => {
        const unit = await testSealedUnit("pressfront#instant/{handle}");
        const result = await runEndpoint({
            unit,
            input: { pathParams: { handle: "quillandclaw.bsky.social" } },
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
    },
});
