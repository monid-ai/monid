import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

/**
 * THE kosa8 suite. Every chain is SYNTHETIC: constructed by hand from the
 * kosa8 Cloud worker source (the route handlers and `publicSandbox` in
 * workers/cloud-api/src), not recorded — no live key was used. Ownership
 * is the fixture's story: `resources` seeds the reader; a foreign id
 * proves the uniform 404 before any upstream call.
 *
 * No live test: every kosa8 call that does anything starts a billed
 * sandbox, so the live check is a manual run with a real key.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

const SID = "sbx_4fQm9TzR2kLw8VbN1cXyPa";
const OWNED: OwnedResource[] = [{
    resource: "kosa8/sandbox",
    externalId: SID,
    data: { template: "python", region: "eu-hel1", cpus: 2, memMb: 4096 },
    syncedAt: "2026-11-03T08:00:00.000Z",
}];
const FREE_RUN = { credits: {}, evidence: {} };

// ---------------------------------------------------------------------------
// create-sandbox — the PROVISIONS anchor
// ---------------------------------------------------------------------------

Deno.test("kosa8 create-sandbox: 201 seeds the owned sandbox; the run is free; cost_usd stripped", async () => {
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

Deno.test("kosa8 create-sandbox: ttl_s is required (a sandbox never outlives its period)", async () => {
    const error = await assertRejects(
        async () =>
            runEndpoint({
                unit: await testSealedUnit("kosa8#create-sandbox"),
                input: { body: { template: "python" } },
                mode: "replay",
                resources: [],
            }),
        EngineError,
    );
    assertEquals((error as EngineError).code, EngineErrorCode.INVALID_INPUT);
});

Deno.test("kosa8 create-sandbox: Store refs and over-long TTLs are refused before the wire", async () => {
    for (
        const body of [
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
});

Deno.test("kosa8 create-sandbox: a refusal is data — no seed, zero usage", async () => {
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

// ---------------------------------------------------------------------------
// exec — USES
// ---------------------------------------------------------------------------

Deno.test("kosa8 exec: runs in an owned sandbox, marks it for reconcile", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("kosa8#exec"),
        input: {
            pathParams: { id: SID },
            body: { cmd: ["python3", "-c", "print(6 * 7)"] },
        },
        mode: "replay",
        fixture: await fixture("synthetic-exec"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, FREE_RUN);
    assertEquals(result.output, { exit: 0, stdout: "42\n", stderr: "" });
    assertEquals(result.resources?.reconciles, [{
        resource: "kosa8/sandbox",
        externalId: SID,
    }]);
});

Deno.test("kosa8 exec: FOREIGN sandbox → the uniform 404, upstream untouched", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("kosa8#exec"),
        input: {
            pathParams: { id: "sbx_someoneElse0000000000" },
            body: { cmd: ["id"] },
        },
        mode: "replay",
        // no fixture: the gate must fire before ANY upstream call
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage.credits, {});
    assertEquals(result.timing.attempts, 0);
});

Deno.test("kosa8 exec: 409 not_running is data", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("kosa8#exec"),
        input: { pathParams: { id: SID }, body: { cmd: ["true"] } },
        mode: "replay",
        fixture: await fixture("synthetic-exec-not-running"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, FREE_RUN);
    assertEquals((result.output as Record<string, Json>).error, "not_running");
});

Deno.test("kosa8 exec: stream is not exposed; bad argv and env refused", async () => {
    for (
        const body of [
            { cmd: ["ls"], stream: true },
            { cmd: [] },
            { cmd: ["env"], env: ["not an assignment"] },
        ] as Json[]
    ) {
        const error = await assertRejects(
            async () =>
                runEndpoint({
                    unit: await testSealedUnit("kosa8#exec"),
                    input: { pathParams: { id: SID }, body },
                    mode: "replay",
                    resources: OWNED,
                }),
            EngineError,
        );
        assertEquals(
            (error as EngineError).code,
            EngineErrorCode.INVALID_INPUT,
            JSON.stringify(body),
        );
    }
});

// ---------------------------------------------------------------------------
// get / sleep / wake / delete / templates
// ---------------------------------------------------------------------------

Deno.test("kosa8 get-sandbox: owned read, cost_usd stripped", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("kosa8#get-sandbox"),
        input: { pathParams: { id: SID } },
        mode: "replay",
        fixture: await fixture("synthetic-get-sandbox"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    const sandbox = (result.output as Record<string, Json>).sandbox as Record<
        string,
        Json
    >;
    assertEquals(sandbox.running_s, 3600);
    assertEquals("cost_usd" in sandbox, false);
});

Deno.test("kosa8 sleep-sandbox and wake-sandbox: owned, free, reconcile-marked", async () => {
    const slept = await runEndpoint({
        unit: await testSealedUnit("kosa8#sleep-sandbox"),
        input: { pathParams: { id: SID } },
        mode: "replay",
        fixture: await fixture("synthetic-sleep-sandbox"),
        resources: OWNED,
    });
    assertEquals(slept.httpStatus, 200);
    assertEquals(slept.usage, FREE_RUN);
    assertEquals(
        ((slept.output as Record<string, Json>).sandbox as Record<string, Json>)
            .state,
        "sleeping",
    );
    assertEquals(slept.resources?.reconciles?.length, 1);

    const woke = await runEndpoint({
        unit: await testSealedUnit("kosa8#wake-sandbox"),
        input: { pathParams: { id: SID } },
        mode: "replay",
        fixture: await fixture("synthetic-wake-sandbox"),
        resources: OWNED,
    });
    assertEquals(woke.httpStatus, 200);
    assertEquals((woke.output as Record<string, Json>).wake_ms, 212);
    assertEquals(woke.resources?.reconciles?.length, 1);
});

Deno.test("kosa8 delete-sandbox: deletes upstream now and emits the release mark", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("kosa8#delete-sandbox"),
        input: { pathParams: { id: SID } },
        mode: "replay",
        fixture: await fixture("synthetic-delete-sandbox"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, FREE_RUN);
    assertEquals(result.output, { ok: true, id: SID });
    assertEquals(result.resources?.releases, [{
        resource: "kosa8/sandbox",
        externalId: SID,
    }]);
});

Deno.test("kosa8 delete-sandbox: FOREIGN sandbox → the uniform 404, nothing deleted", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("kosa8#delete-sandbox"),
        input: { pathParams: { id: "sbx_someoneElse0000000000" } },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.timing.attempts, 0);
    assertEquals(result.resources?.releases ?? [], []);
});

Deno.test("kosa8 list-templates: free, unbound", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("kosa8#list-templates"),
        input: {},
        mode: "replay",
        fixture: await fixture("synthetic-list-templates"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, FREE_RUN);
    const out = result.output as Record<string, Json>;
    assertEquals(out.default_template, "base");
    assertEquals((out.templates as Json[]).length, 3);
});
