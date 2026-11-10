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
const ID = "boxcompute#stop-sandbox";
const VM = "sbx_224ff457bf3f4724841f4ccf343f1fcd";

const OWNED: OwnedResource[] = [{
    resource: "boxcompute/vm",
    externalId: VM,
    data: { size: "small", name: "new-vm" },
}];

const run = async (fixture: string) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { sandboxId: VM } },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}.json`),
        resources: OWNED,
    });

Deno.test("boxcompute#stop-sandbox: stopped, files kept", async () => {
    const result = await run("stop-ok");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const out = result.output as Record<string, Json>;
    assertEquals(out.stopped, true);
    assertEquals((out.sandbox as Record<string, Json>).state, "cold");
    assertEquals((out.sandbox as Record<string, Json>).workspaceId, undefined);
});

Deno.test("boxcompute#stop-sandbox provider error: a busy VM is a 409 answer", async () => {
    const result = await run("stop-busy");
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, Json>).code,
        "SANDBOX_UNAVAILABLE",
    );
});

Deno.test("boxcompute#stop-sandbox: only sbx_ ids, strict body", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const body of [
            { sandboxId: VM.toUpperCase() },
            { sandboxId: VM, force: true },
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
