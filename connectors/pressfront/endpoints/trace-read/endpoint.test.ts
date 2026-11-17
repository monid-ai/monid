import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("pressfront#traces/{id}/{part}: reads a part, bills $0.05", async () => {
    const unit = await testSealedUnit("pressfront#traces/{id}/{part}");
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { id: "01JDEM0SAMP1E000000000000T", part: "accounts" },
            queryParams: { limit: 2 },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}trace-read-accounts.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 0.05 });
    const out = result.output as Record<string, unknown>;
    assert(Array.isArray(out.accounts) && out.accounts.length === 2);
});

Deno.test("pressfront#traces/{id}/{part}: the case card of a name trace, bills $0.05", async () => {
    const unit = await testSealedUnit("pressfront#traces/{id}/{part}");
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { id: "01JDEM0SAMP1E000000000000T", part: "case" },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}case-target.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 0.05 });
    const out = result.output as Record<string, unknown>;
    assertEquals(out.kind, "target");
    assert(String(out.headline).startsWith("Of 187 accounts"));
    assertEquals((out.stops as unknown[]).length, 4);
});

Deno.test("pressfront#traces/{id}/{part}: the case card of a story trace, bills $0.05", async () => {
    const unit = await testSealedUnit("pressfront#traces/{id}/{part}");
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { id: "01JDEM0RVM0R000000000000CS", part: "case" },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}case-rumor.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 0.05 });
    const out = result.output as Record<string, unknown>;
    assertEquals(out.kind, "origin");
    const stops = out.stops as { label: string; url: string | null }[];
    assertEquals(stops.map((s) => s.label), [
        "Started",
        "Spread",
        "Who",
        "Before?",
    ]);
    assert(String(stops[0].url).startsWith("https://x.com/"));
    assert(String(out.note).includes("We never decide who is right."));
});

Deno.test("pressfront#traces/{id}: the status read is free", async () => {
    const unit = await testSealedUnit("pressfront#traces/{id}");
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "01JDEM0SAMP1E000000000000T" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}trace-status-done.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals((result.output as Record<string, unknown>).status, "done");
});
