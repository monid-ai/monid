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
const ID = "boxcompute#run-command";
const VM = "sbx_224ff457bf3f4724841f4ccf343f1fcd";

const OWNED: OwnedResource[] = [{
    resource: "boxcompute/vm",
    externalId: VM,
    data: { size: "small", name: "new-vm" },
}];

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}.json`),
        resources: OWNED,
    });

Deno.test("boxcompute#run-command: stdout, stderr and the exit code", async () => {
    const result = await run("execute-ok", {
        sandboxId: VM,
        argv: ["sh", "-c", "echo hello from boxcompute && uname -s"],
        timeoutSeconds: 60,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        result: {
            stdout: "hello from boxcompute\nLinux\n",
            stderr: "",
            exitCode: 0,
            timedOut: false,
            stdoutTruncated: false,
            stderrTruncated: false,
        },
    });
});

Deno.test("boxcompute#run-command: a non-zero exit is still a 200 answer", async () => {
    const result = await run("execute-exit-code", {
        sandboxId: VM,
        argv: ["sh", "-c", "exit 3"],
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const out = (result.output as Record<string, Json>).result as Record<
        string,
        Json
    >;
    assertEquals(out.exitCode, 3);
    assertEquals(out.stderr, "failing\n");
});

Deno.test("boxcompute#run-command provider error: an invalid key is relayed as data", async () => {
    const result = await run("execute-unauthorized", {
        sandboxId: VM,
        argv: ["true"],
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, Json>).code,
        "INVALID_API_KEY",
    );
});

Deno.test("boxcompute#run-command: a foreign VM is the uniform 404 from the pre-gate", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                sandboxId: "sbx_ffffffffffffffffffffffffffffffff",
                argv: ["true"],
            },
        },
        mode: "replay",
        // no fixture: the pre-gate answers before any upstream call
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("boxcompute#run-command: timeouts over 240 s and paths outside /workspace are refused", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const body of [
            { sandboxId: VM, argv: ["true"], timeoutSeconds: 241 },
            { sandboxId: VM, argv: ["true"], cwd: "/etc" },
            { sandboxId: VM, argv: ["true"], cwd: "/workspace/../etc" },
            { sandboxId: VM, argv: [] },
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
            body: {
                sandboxId: VM,
                argv: ["true"],
                cwd: "/workspace/src",
                timeoutSeconds: 240,
            },
        },
        mode: "replay",
        resources: OWNED,
    });
});
