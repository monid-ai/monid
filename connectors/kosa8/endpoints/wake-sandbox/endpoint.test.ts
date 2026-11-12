import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

/**
 * kosa8#wake-sandbox — USES `kosa8/sandbox`. Every fixture is SYNTHETIC:
 * constructed by hand from the kosa8 Cloud worker source
 * (workers/cloud-api/src), not recorded — no live key was used.
 *
 * No live test: it needs a sandbox, and a sandbox is billed.
 */

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const fixture = (name: string) => loadFixture(`${fixturesDir}${name}.json`);

const SID = "sbx_4fQm9TzR2kLw8VbN1cXyPa";
const OWNED: OwnedResource[] = [{
    resource: "kosa8/sandbox",
    externalId: SID,
    data: { template: "python", region: "eu-hel1", cpus: 2, memMb: 4096 },
    syncedAt: "2026-11-03T08:00:00.000Z",
}];
const FREE_RUN = { credits: {}, evidence: {} };
const UNIT = "kosa8#wake-sandbox";

Deno.test("kosa8#wake-sandbox happy (synthetic 200): owned, free, cost_usd stripped, reconcile-marked", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(UNIT),
        input: { pathParams: { id: SID } },
        mode: "replay",
        fixture: await fixture("synthetic-wake-sandbox"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE_RUN);
    const sandbox = (result.output as Record<string, Json>).sandbox as Record<
        string,
        Json
    >;
    assertEquals(sandbox.id, SID);
    assertEquals(sandbox.state, "running");
    assertEquals("cost_usd" in sandbox, false);
    assertEquals((result.output as Record<string, Json>).wake_ms, 212);
    assertEquals(result.resources?.reconciles, [{
        resource: "kosa8/sandbox",
        externalId: SID,
    }]);
});

Deno.test("kosa8#wake-sandbox: FOREIGN sandbox → the uniform 404, upstream untouched", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(UNIT),
        input: { pathParams: { id: "sbx_someoneElse0000000000" } },
        mode: "replay",
        // no fixture: the ownership gate must fire before ANY upstream call
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, FREE_RUN);
    assertEquals(result.timing.attempts, 0);
});

Deno.test("kosa8#wake-sandbox: schema gate — a malformed or over-long id is refused; a 64-char id passes", async () => {
    for (
        const pathParams of [
            { id: "sbx-4fQm9TzR2kLw8VbN1cXyPa" },
            { id: "s".repeat(65) },
            { id: SID, extra: "x" },
        ] as Record<string, string>[]
    ) {
        const error = await assertRejects(
            async () =>
                runEndpoint({
                    unit: await testSealedUnit(UNIT),
                    input: { pathParams },
                    mode: "replay",
                    resources: OWNED,
                }),
            EngineError,
        );
        assertEquals(
            (error as EngineError).code,
            EngineErrorCode.INVALID_INPUT,
            JSON.stringify(pathParams),
        );
    }
    // near-twin: 64 characters is the route's limit — the schema lets it
    // through and the ownership gate answers (not ours → 404, no call)
    const result = await runEndpoint({
        unit: await testSealedUnit(UNIT),
        input: { pathParams: { id: "s".repeat(64) } },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.timing.attempts, 0);
});

Deno.test("kosa8#wake-sandbox provider error (synthetic 409 not_sleeping): data, empty usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(UNIT),
        input: { pathParams: { id: SID } },
        mode: "replay",
        fixture: await fixture("synthetic-wake-not-sleeping"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, FREE_RUN);
    assertEquals((result.output as Record<string, Json>).error, "not_sleeping");
});
