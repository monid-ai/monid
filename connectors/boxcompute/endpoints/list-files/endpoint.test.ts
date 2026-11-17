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
const ID = "boxcompute#list-files";
const VM = "sbx_224ff457bf3f4724841f4ccf343f1fcd";

const OWNED: OwnedResource[] = [{
    resource: "boxcompute/vm",
    externalId: VM,
    data: { size: "small", name: "new-vm" },
}];

const run = async (fixture: string, path: string) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { sandboxId: VM, path } },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}.json`),
        resources: OWNED,
    });

Deno.test("boxcompute#list-files: one page, the path sent as a query parameter", async () => {
    const result = await run("list-files-ok", "/workspace/.monid-fixture");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        entries: [{
            name: "hello.txt",
            path: "/workspace/.monid-fixture/hello.txt",
            kind: "file",
            size: 5,
            mtimeMs: 0,
        }],
        nextCursor: null,
    });
});

Deno.test("boxcompute#list-files provider error: a missing directory is a 404 answer", async () => {
    const result = await run(
        "list-files-missing",
        "/workspace/.monid-fixture-missing",
    );
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, Json>).code,
        "FILE_NOT_FOUND",
    );
});

Deno.test("boxcompute#list-files: paths outside /workspace and oversized pages are refused", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const body of [
            { sandboxId: VM, path: "/etc" },
            { sandboxId: VM, path: "/workspace/../etc" },
            { sandboxId: VM, path: "/workspace", pageSize: 1001 },
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
        input: {
            body: { sandboxId: VM, path: "/workspace/src", pageSize: 1000 },
        },
        mode: "replay",
        resources: OWNED,
    });
});
