import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("pressfront#traces: a name, poll to done, settle case + story + brief + id, bill $4.99", async () => {
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
    const card = out.case as Record<string, unknown>;
    assertEquals(card.kind, "target");
    assertEquals(
        (card.stops as { label: string }[]).map((s) => s.label),
        ["Started", "Spread", "Who", "Before?"],
    );
});

Deno.test("pressfront#traces: a situation in plain words becomes a story trace; settles case + brief, story null, bills $4.99", async () => {
    const unit = await testSealedUnit("pressfront#traces");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                text: "people keep saying Lara went partying after the " +
                    "concert was cancelled, and Manon fans keep posting it",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-trace-rumor-done.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, { default: 4.99 });
    const out = result.output as Record<string, unknown>;
    assertEquals(out.id, "01JDEM0RVM0R000000000000CS");
    assertEquals(out.kind, "origin");
    assertEquals(out.story, null);
    assert(
        typeof out.brief === "string" && out.brief.includes("## The answer"),
    );
    const card = out.case as Record<string, unknown>;
    assertEquals(card.kind, "origin");
    assert(String(card.headline).includes("now gone"));
    assertEquals((card.stops as unknown[]).length, 4);
    assert(card.saidBack);
});

Deno.test("pressfront#traces: exactly one of name, claim or text", async () => {
    const unit = await testSealedUnit("pressfront#traces");
    const fixture = await loadFixture(`${chains}synthetic-trace-failed.json`);
    for (
        const ok of [
            { name: "@quillandclaw" },
            { claim: "Lara went partying after concert cancelled" },
            { text: "what is going on with @quillandclaw" },
            {
                text: "this screenshot is going around",
                files: [{ mediaType: "image/png", data: "iVBORw0KGgo=" }],
            },
        ] as Record<string, Json>[]
    ) {
        await assertInputAccepted({
            unit,
            input: { body: ok },
            mode: "replay",
            fixture,
        });
    }
    for (
        const bad of [
            {},
            { name: "@quillandclaw", claim: "a story" },
            { claim: "a story", text: "in my words" },
            { files: [{ mediaType: "image/png", data: "iVBORw0KGgo=" }] },
            {
                text: "a page",
                files: [{ mediaType: "text/html", data: "PGgx" }],
            },
        ] as Record<string, Json>[]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: bad },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(bad),
        );
    }
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
