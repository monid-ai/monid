import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

/**
 * kosa8#exec — USES `kosa8/sandbox`. Every fixture is SYNTHETIC:
 * constructed by hand from the kosa8 Cloud worker source
 * (workers/cloud-api/src), not recorded — no live key was used.
 *
 * No live test: exec needs a sandbox, and a sandbox is billed.
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

Deno.test("kosa8#exec happy (synthetic 200): runs in an owned sandbox, free, marks it for reconcile", async () => {
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
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE_RUN);
    // exec answers carry no sandbox object, so there is no cost_usd to strip
    assertEquals(result.output, { exit: 0, stdout: "42\n", stderr: "" });
    assertEquals(result.resources?.reconciles, [{
        resource: "kosa8/sandbox",
        externalId: SID,
    }]);
});

Deno.test("kosa8#exec: FOREIGN sandbox → the uniform 404, upstream untouched", async () => {
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
    assertEquals(result.usage, FREE_RUN);
    assertEquals(result.timing.attempts, 0);
});

Deno.test("kosa8#exec: schema gate — stream not exposed, bad argv and env refused; a NAME=value env passes", async () => {
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
    // near-twin: a well-formed NAME=value env passes the schema and runs
    // (replay matches method and URL, so the 200 answers it)
    const result = await runEndpoint({
        unit: await testSealedUnit("kosa8#exec"),
        input: {
            pathParams: { id: SID },
            body: { cmd: ["python3", "-c", "print(6 * 7)"], env: ["DEBUG=1"] },
        },
        mode: "replay",
        fixture: await fixture("synthetic-exec"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
});

Deno.test("kosa8#exec provider error (synthetic 409 not_running): data, empty usage", async () => {
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
