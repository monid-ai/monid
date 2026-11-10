import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "boxcompute#get-sandbox";
const VM = "sbx_224ff457bf3f4724841f4ccf343f1fcd";
const GONE = "sbx_ed730f785e584b43982a8ada3722af1b";

const OWNED: OwnedResource[] = [VM, GONE].map((externalId) => ({
    resource: "boxcompute/vm",
    externalId,
    data: { size: "small" },
}));

Deno.test("boxcompute#get-sandbox: the live record, pool internals stripped", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { sandboxId: VM } },
        mode: "replay",
        fixture: await loadFixture(`${chains}get-cold.json`),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const sandbox = (result.output as Record<string, Json>).sandbox as Record<
        string,
        Json
    >;
    assertEquals(sandbox.state, "cold");
    assertEquals(sandbox.size, "small");
    assertEquals(sandbox.workspaceId, undefined);
    assertEquals(sandbox.metadata, undefined);
});

Deno.test("boxcompute#get-sandbox provider error: an owned VM deleted upstream is a 404 answer", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { sandboxId: GONE } },
        mode: "replay",
        fixture: await loadFixture(`${chains}get-missing.json`),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals((result.output as Record<string, Json>).code, "NOT_FOUND");
});

Deno.test("boxcompute#get-sandbox: a foreign id is the uniform 404 from the pre-gate", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: { sandboxId: "sbx_ffffffffffffffffffffffffffffffff" },
        },
        mode: "replay",
        // no fixture: the pre-gate answers before any upstream call
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("boxcompute#get-sandbox: only sbx_ ids, strict body", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const body of [
            { sandboxId: VM.toUpperCase() },
            { sandboxId: VM, size: "small" },
        ] as Json[]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body },
                    mode: "replay",
                    resources: OWNED,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertInputAccepted({
        unit,
        input: { body: { sandboxId: VM } },
        mode: "replay",
        resources: OWNED,
    });
});
