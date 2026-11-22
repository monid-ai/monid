import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * computesdk suite. live-* fixtures were recorded with `deno task record`;
 * synthetic-* chains reuse response bodies from a live 2026-11-13 run
 * (the recorder cannot drive owned-resource endpoints). Every endpoint is
 * FREE: the sandbox resource carries the runtime charge.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

const OWNED: OwnedResource[] = [{
    resource: "computesdk/sandbox",
    externalId: "sbx-1",
    data: { provider: "tensorlake", size: "small" },
    syncedAt: "2026-11-13T20:46:37.000Z",
}];

const run = async (
    endpoint: string,
    body: Record<string, Json>,
    name: string,
    resources: OwnedResource[] = OWNED,
) => await runEndpoint({
    unit: await testSealedUnit(`computesdk#${endpoint}`),
    input: { body },
    mode: "replay",
    fixture: await fixture(name),
    resources,
});

Deno.test("computesdk get-options: providers and rates, free", async () => {
    const result = await run("get-options", {}, "live-options", []);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, {});
    const out = result.output as { options: unknown[] };
    assert(out.options.length > 0);
});

Deno.test("computesdk get-quote: a placement quote, free", async () => {
    const result = await run("get-quote", { size: "small" }, "live-quote", []);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, {});
    const quote = (result.output as Record<string, Record<string, Json>>).quote;
    assert(quote !== undefined);
    assertEquals(quote.placement, {
        provider: "tensorlake",
        region: null,
        size: "small",
    });
    assertEquals((quote.rateUsd as Record<string, Json>).perHour, 0.1);
});

Deno.test("computesdk create-sandbox: provisions the sandbox resource, no call fee", async () => {
    const result = await run(
        "create-sandbox",
        { label: "monid-fixture", size: "small", timeoutMs: 180000 },
        "live-create",
        [],
    );
    assertEquals(result.httpStatus, 201);
    assertEquals(result.usage.credits, {});
    const seed = result.resources?.provisions?.[0];
    assert(seed !== undefined, "expected a provision seed");
    assertEquals(seed.resource, "computesdk/sandbox");
    assertEquals(seed.externalId, "8f458022-5782-47ea-87bd-7d776caae0f1");
    assertEquals(seed.identifier, "monid-fixture");
    assertEquals(seed.data, {
        provider: "tensorlake",
        size: "small",
        label: "monid-fixture",
    });
});

Deno.test("computesdk run-command: buffered result in an owned sandbox", async () => {
    const result = await run(
        "run-command",
        { sandboxId: "sbx-1", command: "echo hello && uname -s" },
        "synthetic-run-command",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, {});
    const out = result.output as Record<string, Json>;
    assertEquals(out.exitCode, 0);
    assertEquals(out.stdout, "hello\nLinux\n");
});

Deno.test("computesdk run-command: a FOREIGN sandbox is the uniform 404, upstream untouched", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("computesdk#run-command"),
        input: { body: { sandboxId: "sbx-FOREIGN", command: "id" } },
        mode: "replay",
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage.credits, {});
});

Deno.test("computesdk files: write then read in an owned sandbox", async () => {
    const wrote = await run(
        "write-file",
        {
            sandboxId: "sbx-1",
            path: "/tmp/hello.txt",
            content: "hi from monid",
        },
        "synthetic-write-file",
    );
    assertEquals(wrote.httpStatus, 200);
    const read = await run(
        "read-file",
        { sandboxId: "sbx-1", path: "/tmp/hello.txt" },
        "synthetic-read-file",
    );
    assertEquals(read.httpStatus, 200);
    assertEquals(
        (read.output as Record<string, Json>).content,
        "hi from monid",
    );
});

Deno.test("computesdk processes: start detached, then read its output", async () => {
    const started = await run(
        "start-process",
        { sandboxId: "sbx-1", command: "sleep 2 && echo done" },
        "synthetic-start-process",
    );
    assertEquals(started.httpStatus, 201);
    const status = await run(
        "get-process",
        { sandboxId: "sbx-1", jobId: "c9b46dc58b7dbd85827ec8d75e8" },
        "synthetic-get-process",
    );
    assertEquals(status.httpStatus, 200);
    const proc = (status.output as { process: Record<string, Json> }).process;
    assertEquals(proc.status, "exited");
    assertEquals(proc.stdout, "done\n");
});

Deno.test("computesdk get-sandbox-url: public URL for a port", async () => {
    const result = await run(
        "get-sandbox-url",
        { sandboxId: "sbx-1", port: 3000 },
        "synthetic-sandbox-url",
    );
    assertEquals(result.httpStatus, 200);
    assert(
        String((result.output as Record<string, Json>).url).startsWith(
            "http://3000-",
        ),
    );
});

Deno.test("computesdk get-sandbox: reads the owned sandbox and its running cost", async () => {
    const result = await run(
        "get-sandbox",
        { sandboxId: "sbx-1" },
        "synthetic-get-sandbox",
    );
    assertEquals(result.httpStatus, 200);
    const s = (result.output as { sandbox: Record<string, Json> }).sandbox;
    assertEquals(s.status, "running");
});

Deno.test("computesdk destroy-sandbox: releases the resource; runtime settles on the sandbox", async () => {
    const result = await run(
        "destroy-sandbox",
        { sandboxId: "sbx-1" },
        "synthetic-destroy-sandbox",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, {});
    assertEquals(result.resources?.releases?.[0]?.externalId, "sbx-1");
    const cost =
        (result.output as { sandbox: { cost: Record<string, Json> } }).sandbox
            .cost;
    assertEquals(cost.settled, true);
    assertEquals(cost.costUsd, 0.000357);
});

Deno.test("computesdk delete-path: removes a path in an owned sandbox", async () => {
    const result = await run(
        "delete-path",
        { sandboxId: "sbx-1", path: "/tmp/hello.txt" },
        "synthetic-delete-path",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, {});
    assertEquals((result.output as Record<string, Json>).removed, true);
});

Deno.test("computesdk kill-process: signals a process without destroying the sandbox", async () => {
    const result = await run(
        "kill-process",
        {
            sandboxId: "sbx-1",
            jobId: "5d8c89d3451365ec317df3d09d",
            signal: "SIGKILL",
        },
        "synthetic-kill-process",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, {});
    assertEquals(result.resources?.releases ?? [], []);
    const proc = (result.output as { process: Record<string, Json> }).process;
    assertEquals(proc.jobId, "5d8c89d3451365ec317df3d09d");
});

Deno.test("computesdk delete-path / kill-process: a FOREIGN sandbox is the uniform 404", async () => {
    for (
        const [endpoint, body] of [
            ["delete-path", { sandboxId: "sbx-FOREIGN", path: "/tmp/x" }],
            ["kill-process", { sandboxId: "sbx-FOREIGN", jobId: "j-1" }],
        ] as const
    ) {
        const result = await runEndpoint({
            unit: await testSealedUnit(`computesdk#${endpoint}`),
            input: { body },
            mode: "replay",
            resources: OWNED,
        });
        assertEquals(result.httpStatus, 404, endpoint);
        assertEquals(result.usage.credits, {});
    }
});

Deno.test("computesdk list-sandboxes: served from the ownership window only", async () => {
    const unit = await testSealedUnit("computesdk#list-sandboxes");
    const owned = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        // no fixture: never calls GET /api/v1/sandboxes (shared key)
        resources: OWNED,
    });
    assertEquals(owned.httpStatus, 200);
    assertEquals(owned.usage.credits, {});
    assertEquals(owned.output, [{
        sandboxId: "sbx-1",
        provider: "tensorlake",
        size: "small",
    }]);
    const empty = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        resources: [],
    });
    assertEquals(empty.output, []);
});

Deno.test("computesdk create-sandbox / get-quote: provider must be a listed provider", async () => {
    for (const endpoint of ["create-sandbox", "get-quote"]) {
        const unit = await testSealedUnit(`computesdk#${endpoint}`);
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: { provider: "not-a-provider" } },
                    mode: "replay",
                    resources: [],
                }),
            Error,
            "INVALID_INPUT",
        );
        await assertInputAccepted({
            unit,
            input: { body: { provider: "e2b" } },
            mode: "replay",
            resources: [],
        });
    }
});
