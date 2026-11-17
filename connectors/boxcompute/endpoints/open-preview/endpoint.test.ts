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
const ID = "boxcompute#open-preview";
const VM = "sbx_224ff457bf3f4724841f4ccf343f1fcd";

const OWNED: OwnedResource[] = [{
    resource: "boxcompute/vm",
    externalId: VM,
    data: { size: "small", name: "new-vm" },
}];

const run = async (fixture: string) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { sandboxId: VM, port: 8080 } },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}.json`),
        resources: OWNED,
    });

Deno.test("boxcompute#open-preview: a one-hour URL for one port", async () => {
    const result = await run("preview-ok");
    assertEquals(result.httpStatus, 201);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        preview: {
            previewId: "2cc3b0883a7740849359122904aa45a1",
            sandboxId: VM,
            port: 8080,
            url: "https://0123456789abcdef0123456789abcdef.bxcpreview.site",
            expiresAt: "2026-10-26T08:42:40.000Z",
        },
    });
});

Deno.test("boxcompute#open-preview provider error: an invalid key is relayed as data", async () => {
    const result = await run("preview-unauthorized");
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, Json>).code,
        "INVALID_API_KEY",
    );
});

Deno.test("boxcompute#open-preview: ports outside 1-65535 are refused", async () => {
    const unit = await testSealedUnit(ID);
    for (const port of [0, 65536]) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: { sandboxId: VM, port } },
                    mode: "replay",
                    resources: OWNED,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertInputAccepted({
        unit,
        input: { body: { sandboxId: VM, port: 65535 } },
        mode: "replay",
        resources: OWNED,
    });
});
