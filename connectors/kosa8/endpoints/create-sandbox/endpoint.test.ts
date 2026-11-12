import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

/**
 * kosa8#create-sandbox — the PROVISIONS anchor of `kosa8/sandbox`. Every
 * fixture is SYNTHETIC: constructed by hand from the kosa8 Cloud worker
 * source (workers/cloud-api/src), not recorded — no live key was used.
 *
 * No live test: a create starts a billed sandbox.
 */

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const fixture = (name: string) => loadFixture(`${fixturesDir}${name}.json`);

const SID = "sbx_4fQm9TzR2kLw8VbN1cXyPa";
const FREE_RUN = { credits: {}, evidence: {} };

Deno.test("kosa8#create-sandbox happy (synthetic 201): seeds the owned sandbox; the run is free; cost_usd stripped", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("kosa8#create-sandbox"),
        input: { body: { template: "python", ttl_s: 3600 } },
        mode: "replay",
        fixture: await fixture("synthetic-create-sandbox"),
        resources: [],
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE_RUN);
    const seed = result.resources?.provisions?.[0];
    assert(seed !== undefined, "expected a provision seed");
    assertEquals(seed.resource, "kosa8/sandbox");
    assertEquals(seed.externalId, SID);
    assertEquals(seed.data, {
        template: "python",
        region: "eu-hel1",
        cpus: 2,
        memMb: 4096,
    });
    const sandbox = (result.output as Record<string, Json>).sandbox as Record<
        string,
        Json
    >;
    assertEquals(sandbox.id, SID);
    assertEquals(sandbox.state, "running");
    assertEquals("cost_usd" in sandbox, false);
});

Deno.test("kosa8#create-sandbox: schema gate — ttl_s required, Store refs and over-long TTLs refused; the 28-day TTL passes", async () => {
    for (
        const body of [
            { template: "python" },
            { template: "acme/agent-box", ttl_s: 3600 },
            { template: "python", ttl_s: 2_419_201 },
            { template: "python", ttl_s: 3600, accept_price: 5 },
        ] as Json[]
    ) {
        const error = await assertRejects(
            async () =>
                runEndpoint({
                    unit: await testSealedUnit("kosa8#create-sandbox"),
                    input: { body },
                    mode: "replay",
                    resources: [],
                }),
            EngineError,
        );
        assertEquals(
            (error as EngineError).code,
            EngineErrorCode.INVALID_INPUT,
            JSON.stringify(body),
        );
    }
    // near-twin: ttl_s at the 28-day maximum passes the schema and runs
    // (replay matches method and URL, so the 201 answers it)
    const result = await runEndpoint({
        unit: await testSealedUnit("kosa8#create-sandbox"),
        input: { body: { template: "python", ttl_s: 2_419_200 } },
        mode: "replay",
        fixture: await fixture("synthetic-create-sandbox"),
        resources: [],
    });
    assertEquals(result.httpStatus, 201);
});

Deno.test("kosa8#create-sandbox provider error (synthetic 503 no_capacity): no seed, empty usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("kosa8#create-sandbox"),
        input: { body: { template: "python", ttl_s: 3600 } },
        mode: "replay",
        fixture: await fixture("synthetic-create-no-capacity"),
        resources: [],
    });
    assertEquals(result.httpStatus, 503);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, FREE_RUN);
    assertEquals(result.resources?.provisions ?? [], []);
    assertEquals((result.output as Record<string, Json>).error, "no_capacity");
});
