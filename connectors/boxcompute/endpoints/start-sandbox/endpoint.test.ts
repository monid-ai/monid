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
const ID = "boxcompute#start-sandbox";
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

Deno.test("boxcompute#start-sandbox: answers once the VM runs", async () => {
    const result = await run("start-ok");
    assertEquals(result.httpStatus, 201);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const sandbox = (result.output as Record<string, Json>).sandbox as Record<
        string,
        Json
    >;
    assertEquals(sandbox.id, VM);
    assertEquals(sandbox.state, "running");
    assertEquals(sandbox.workspaceId, undefined);
});

Deno.test("boxcompute#start-sandbox provider error: an invalid key is relayed as data", async () => {
    const result = await run("start-unauthorized");
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, Json>).code,
        "INVALID_API_KEY",
    );
});

Deno.test("boxcompute#start-sandbox: only sbx_ ids, strict body", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const body of [
            { sandboxId: VM.toUpperCase() },
            { sandboxId: VM, size: "large" },
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
