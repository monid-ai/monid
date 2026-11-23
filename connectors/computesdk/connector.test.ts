import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
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

// every endpoint is FREE: success and error both settle the empty usage
const FREE = { credits: {}, evidence: {} };

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
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
    const out = result.output as { options: unknown[] };
    assert(out.options.length > 0);
});

Deno.test("computesdk get-quote: a placement quote, free", async () => {
    const result = await run("get-quote", { size: "small" }, "live-quote", []);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
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
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
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
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
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
    assertEquals(result.usage, FREE);
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
    assertEquals(wrote.isProviderError, false);
    assertEquals(wrote.usage, FREE);
    const read = await run(
        "read-file",
        { sandboxId: "sbx-1", path: "/tmp/hello.txt" },
        "synthetic-read-file",
    );
    assertEquals(read.httpStatus, 200);
    assertEquals(read.usage, FREE);
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
    assertEquals(started.usage, FREE);
    const status = await run(
        "get-process",
        { sandboxId: "sbx-1", jobId: "c9b46dc58b7dbd85827ec8d75e8" },
        "synthetic-get-process",
    );
    assertEquals(status.httpStatus, 200);
    assertEquals(status.usage, FREE);
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
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
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
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
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
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
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
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
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
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
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
        assertEquals(result.usage, FREE);
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
    assertEquals(owned.usage, FREE);
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

Deno.test("computesdk create-sandbox: a null label still provisions, identified by id", async () => {
    const result = await run(
        "create-sandbox",
        { size: "small", timeoutMs: 180000 },
        "synthetic-create-unlabeled",
        [],
    );
    assertEquals(result.httpStatus, 201);
    const seed = result.resources?.provisions?.[0];
    assert(seed !== undefined, "expected a provision seed");
    assertEquals(seed.identifier, seed.externalId);
    assertEquals(seed.data, { provider: "tensorlake", size: "small" });
});

Deno.test("computesdk create-sandbox: no caller idempotency key reaches the shared account", async () => {
    await assertRejects(
        async () =>
            runEndpoint({
                unit: await testSealedUnit("computesdk#create-sandbox"),
                input: { body: { idempotencyKey: "k-1" } },
                mode: "replay",
                resources: [],
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test("computesdk run-command: timeouts cover the 290 s command window", async () => {
    const { doc } = await testSealedUnit("computesdk#run-command");
    assert(doc.timeouts.requestMs > 290_000);
    assert(doc.timeouts.runMs >= doc.timeouts.requestMs);
});

Deno.test("computesdk files: a relative path is refused by the compiled schema", async () => {
    for (const endpoint of ["read-file", "write-file", "delete-path"]) {
        const unit = await testSealedUnit(`computesdk#${endpoint}`);
        const body: Record<string, Json> = endpoint === "write-file"
            ? { sandboxId: "sbx-1", content: "x" }
            : { sandboxId: "sbx-1" };
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: { ...body, path: "tmp/hello.txt" } },
                    mode: "replay",
                    resources: OWNED,
                }),
            Error,
            "INVALID_INPUT",
        );
        await assertInputAccepted({
            unit,
            input: { body: { ...body, path: "/tmp/hello.txt" } },
            mode: "replay",
            resources: OWNED,
        });
    }
});

// ---------------------------------------------------------------------------
// provider error: an upstream non-2xx is data, never billed, never a seed
// ---------------------------------------------------------------------------

const PROVIDER_ERRORS: [string, Record<string, Json>, number][] = [
    ["get-options", {}, 401],
    ["get-quote", { size: "small" }, 401],
    ["create-sandbox", { size: "small" }, 401],
    ["get-sandbox", { sandboxId: "sbx-1" }, 404],
    ["destroy-sandbox", { sandboxId: "sbx-1" }, 404],
    ["run-command", { sandboxId: "sbx-1", command: "id" }, 404],
    ["read-file", { sandboxId: "sbx-1", path: "/tmp/hello.txt" }, 404],
    [
        "write-file",
        { sandboxId: "sbx-1", path: "/tmp/hello.txt", content: "x" },
        404,
    ],
    ["delete-path", { sandboxId: "sbx-1", path: "/tmp/hello.txt" }, 404],
    ["start-process", { sandboxId: "sbx-1", command: "id" }, 404],
    ["get-process", { sandboxId: "sbx-1", jobId: "j-1" }, 404],
    ["kill-process", { sandboxId: "sbx-1", jobId: "j-1" }, 404],
    ["get-sandbox-url", { sandboxId: "sbx-1", port: 3000 }, 404],
];

for (const [endpoint, body, status] of PROVIDER_ERRORS) {
    Deno.test(`computesdk ${endpoint} provider error: HTTP ${status} is data, zero usage`, async () => {
        const result = await run(endpoint, body, `synthetic-error-${endpoint}`);
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, FREE);
        assertEquals(result.resources?.provisions ?? [], []);
        assertEquals(result.resources?.releases ?? [], []);
        assertEquals(
            typeof (result.output as Record<string, Json>).error,
            "string",
        );
    });
}

// ---------------------------------------------------------------------------
// schema gate: a near-valid bad input is refused, its near-twin passes.
// get-options and list-sandboxes take no caller input, so they have no gate.
// ---------------------------------------------------------------------------

const GATES: [string, Record<string, Json>, Record<string, Json>][] = [
    ["get-sandbox", { sandboxId: "" }, { sandboxId: "sbx-1" }],
    ["destroy-sandbox", { sandboxId: "" }, { sandboxId: "sbx-1" }],
    [
        "run-command",
        { sandboxId: "sbx-1", command: "id", timeoutMs: 290_001 },
        { sandboxId: "sbx-1", command: "id", timeoutMs: 290_000 },
    ],
    [
        "start-process",
        { sandboxId: "sbx-1", command: "" },
        { sandboxId: "sbx-1", command: "id" },
    ],
    [
        "get-process",
        { sandboxId: "sbx-1", jobId: "" },
        { sandboxId: "sbx-1", jobId: "j-1" },
    ],
    [
        "kill-process",
        { sandboxId: "sbx-1", jobId: "j-1", signal: "S".repeat(33) },
        { sandboxId: "sbx-1", jobId: "j-1", signal: "S".repeat(32) },
    ],
    [
        "get-sandbox-url",
        { sandboxId: "sbx-1", port: 65536 },
        { sandboxId: "sbx-1", port: 65535 },
    ],
    [
        "create-sandbox",
        { label: "x".repeat(201) },
        { label: "x".repeat(200) },
    ],
    ["get-quote", { timeoutMs: 0 }, { timeoutMs: 1 }],
];

for (const [endpoint, bad, twin] of GATES) {
    Deno.test(`computesdk ${endpoint} schema gate: bad input refused, near-twin accepted`, async () => {
        const unit = await testSealedUnit(`computesdk#${endpoint}`);
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: bad },
                    mode: "replay",
                    resources: OWNED,
                }),
            Error,
            "INVALID_INPUT",
        );
        await assertInputAccepted({
            unit,
            input: { body: twin },
            mode: "replay",
            resources: OWNED,
        });
    });
}

// ---------------------------------------------------------------------------
// live (gated on COMPUTESDK_API_KEY): shapes, not amounts. The sandbox
// chain creates one small sandbox and always destroys it.
// ---------------------------------------------------------------------------

Deno.test({
    name: "computesdk live: get-options and get-quote answer",
    ignore: liveSkip("computesdk"),
    fn: async () => {
        const live = async (endpoint: string, body: Record<string, Json>) =>
            await runEndpoint({
                unit: await testSealedUnit(`computesdk#${endpoint}`),
                input: { body },
                mode: "live",
                resources: [],
            });
        const options = await live("get-options", {});
        assertEquals(
            options.isProviderError,
            false,
            JSON.stringify(options.output),
        );
        assertEquals(options.usage, FREE);
        assert((options.output as { options: unknown[] }).options.length > 0);
        const quoted = await live("get-quote", { size: "small" });
        assertEquals(
            quoted.isProviderError,
            false,
            JSON.stringify(quoted.output),
        );
        assertEquals(quoted.usage, FREE);
        const quote = (quoted.output as { quote: Record<string, Json> }).quote;
        assertEquals(
            typeof (quote.placement as Record<string, Json>).provider,
            "string",
        );
    },
});

Deno.test({
    name: "computesdk live: create, work in, and destroy one sandbox",
    ignore: liveSkip("computesdk"),
    fn: async () => {
        const live = async (
            endpoint: string,
            body: Record<string, Json>,
            resources: OwnedResource[] = [],
        ) => {
            const result = await runEndpoint({
                unit: await testSealedUnit(`computesdk#${endpoint}`),
                input: { body },
                mode: "live",
                resources,
            });
            assertEquals(
                result.isProviderError,
                false,
                `${endpoint}: ${JSON.stringify(result.output)}`,
            );
            assertEquals(result.usage, FREE, endpoint);
            return result;
        };
        const created = await live("create-sandbox", {
            label: "monid-live-test",
            size: "small",
            timeoutMs: 120_000,
        });
        const seed = created.resources?.provisions?.[0];
        assert(seed !== undefined, "expected a provision seed");
        const sandboxId = seed.externalId;
        const owned: OwnedResource[] = [{
            resource: "computesdk/sandbox",
            externalId: sandboxId,
            data: seed.data ?? {},
        }];
        try {
            const ran = await live("run-command", {
                sandboxId,
                command: "echo live",
            }, owned);
            const out = ran.output as Record<string, Json>;
            assertEquals(out.exitCode, 0);
            assertEquals(typeof out.stdout, "string");
            await live("write-file", {
                sandboxId,
                path: "/tmp/monid-live.txt",
                content: "live",
            }, owned);
            const read = await live("read-file", {
                sandboxId,
                path: "/tmp/monid-live.txt",
            }, owned);
            assertEquals(
                typeof (read.output as Record<string, Json>).content,
                "string",
            );
            await live("delete-path", {
                sandboxId,
                path: "/tmp/monid-live.txt",
            }, owned);
            const started = await live("start-process", {
                sandboxId,
                command: "sleep 30",
            }, owned);
            const jobId = String(
                (started.output as Record<string, Json>).jobId ??
                    ((started.output as { process?: Record<string, Json> })
                        .process?.jobId),
            );
            await live("get-process", { sandboxId, jobId }, owned);
            await live("kill-process", { sandboxId, jobId }, owned);
            const url = await live("get-sandbox-url", {
                sandboxId,
                port: 3000,
            }, owned);
            assertEquals(
                typeof (url.output as Record<string, Json>).url,
                "string",
            );
            const got = await live("get-sandbox", { sandboxId }, owned);
            assertEquals(
                typeof (got.output as { sandbox: Record<string, Json> }).sandbox
                    .status,
                "string",
            );
            const listed = await live("list-sandboxes", {}, owned);
            assertEquals((listed.output as Json[]).length, 1);
        } finally {
            const destroyed = await live(
                "destroy-sandbox",
                { sandboxId },
                owned,
            );
            assertEquals(
                destroyed.resources?.releases?.[0]?.externalId,
                sandboxId,
            );
        }
    },
});
