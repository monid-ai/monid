import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("rheono: compiled urls, FREE settle wiring, keyless auth", async () => {
    const bundle = await testBundle();
    assertEquals(
        bundle.endpoints["rheono#check"].request.url,
        "https://rheono.dev/api/check-app",
    );
    assertEquals(
        bundle.endpoints["rheono#request-pentest"].request.url,
        "https://rheono.dev/api/check-request",
    );
    // FREE provider (D27): no vendor meter — no consolidate fn compiles at
    // all, and BOTH quantities slots on BOTH docs are the one
    // compiler-synthesized `() => ({counts: {}})` entry (same $fn.key)
    const check = bundle.endpoints["rheono#check"];
    const pentest = bundle.endpoints["rheono#request-pentest"];
    assertEquals(check.usage.consolidate, undefined);
    assertEquals(pentest.usage.consolidate, undefined);
    const synthesizedKey = check.usage.evidence.$fn.key;
    assertEquals(check.usage.estimate.$fn.key, synthesizedKey);
    assertEquals(pentest.usage.evidence.$fn.key, synthesizedKey);
    assertEquals(pentest.usage.estimate.$fn.key, synthesizedKey);
    assertEquals(
        bundle.fnTable[synthesizedKey].provenance,
        "core#usage.synthesizedEmpty",
    );
    // keyless: an empty credential shape compiles to a schema nothing fails
    const properties = check.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    assert("url" in properties, "url is the one caller-facing field");
});

Deno.test("rheono#check happy (recorded 2026-10-24): free — zero usage, body is the contract", async () => {
    const unit = await testSealedUnit("rheono#check");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://app.example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // FREE model (D25/D26): nothing folds, nothing is evidenced
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output projection on this doc: the recorded body IS the contract —
    // a dropped findings list or an injected field must fail
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("rheono#check provider error (recorded 2026-10-24): 400 is data, zero usage", async () => {
    const unit = await testSealedUnit("rheono#check");
    const fixture = await loadFixture(
        `${fixturesDir}provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { url: "not a host" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { ok: false, error: "invalid url" });
});

Deno.test({
    name:
        "rheono#check live (keyless — runs wherever the network reaches rheono.dev)",
    ignore: liveSkip("rheono"),
    fn: async () => {
        const unit = await testSealedUnit("rheono#check");
        const result = await runEndpoint({
            unit,
            input: { body: { url: "https://app.example.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assert(Array.isArray(output.findings), "findings array present");
        assertEquals(output.ok, true);
    },
});
