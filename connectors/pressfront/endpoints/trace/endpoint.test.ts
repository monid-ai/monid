import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("pressfront#traces: submit, poll to done, settle story + brief + id, bill $4.99", async () => {
    const unit = await testSealedUnit("pressfront#traces");
    const result = await runEndpoint({
        unit,
        input: { body: { name: "quillandclaw.bsky.social" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-trace-done.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, { default: 4.99 });
    const out = result.output as Record<string, unknown>;
    assertEquals(out.id, "01JDEM0SAMP1E000000000000T");
    assertEquals(out.status, "done");
    assert(typeof out.brief === "string" && out.brief.startsWith("# Trace"));
    assert((out.story as Record<string, unknown>).headline);
});

Deno.test("pressfront#traces: a failed trace settles as a 500 and costs nothing", async () => {
    const unit = await testSealedUnit("pressfront#traces");
    const result = await runEndpoint({
        unit,
        input: { body: { name: "quillandclaw.bsky.social" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-trace-failed.json`),
    });
    assertEquals(result.httpStatus, 500);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});
