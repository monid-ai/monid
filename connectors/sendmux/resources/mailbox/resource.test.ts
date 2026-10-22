import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import {
    loadFixture,
    loadResource,
    testBundle,
    testResourceUnit,
} from "@shared/testing";
import { directTransport, Engine, EngineError } from "@monid/connector-engine";

const HERE = fromFileUrl(new URL("../../", import.meta.url));
const ROW: OwnedResource = {
    resource: "sendmux/mailbox",
    externalId: "mbx_owned",
    data: { email: "agent@example.com" },
};

Deno.test("sendmux mailbox has zero monthly rent and charges usage only through resource readings", async () => {
    const unit = await testResourceUnit("sendmux/mailbox");
    assertEquals(unit.doc.usage.period, {
        unit: "MONTH",
        count: 1,
        anchor: "CREATION_TIME",
    });
    assertEquals(unit.doc.usage.lines.rent, {
        consumes: { credit: "default", amount: 0 },
    });
    assertEquals(Object.keys(unit.doc.usage.lines).sort(), [
        "incoming",
        "outgoing",
        "rent",
        "storage",
    ]);
    assertEquals(Object.keys(unit.doc.reconcileUsage ?? {}).sort(), [
        "incoming",
        "outgoing",
        "storage",
    ]);
    const endpoints = Object.values((await testBundle()).endpoints).filter(
        (endpoint) => endpoint.provider === "sendmux",
    );
    assertEquals(endpoints.length, 29);
    for (const endpoint of endpoints) {
        assertEquals(endpoint.usage.model.kind, "FREE", endpoint.id);
    }
});

Deno.test("sendmux mailbox release treats repeated deletion as success", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("sendmux/mailbox"),
        mode: "replay",
        fixture: await loadFixture(
            `${HERE}fixtures/synthetic-release-twice.json`,
        ),
    });
    assertEquals(await resource.release(ROW), { released: true });
    assertEquals(await resource.release(ROW), { released: true });
});

const WINDOW = {
    startIso: "2026-09-01T00:00:00.000Z",
    endIso: "2026-09-02T00:00:00.000Z",
};

Deno.test("sendmux meter refuses pending cost instead of settling zero", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("sendmux/mailbox"),
        mode: "replay",
        fixture: await loadFixture(
            `${HERE}fixtures/synthetic-usage-pending.json`,
        ),
    });
    await assertRejects(
        () => resource.reconcileUsage("incoming", ROW, WINDOW),
        Error,
        "not final",
    );
});

Deno.test("sendmux meter returns posted cumulative lines on repeated and post-release reads", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("sendmux/mailbox"),
        mode: "replay",
        fixture: await loadFixture(
            `${HERE}fixtures/synthetic-usage-final.json`,
        ),
    });
    assertEquals(await resource.release(ROW), { released: true });
    assertEquals(await resource.reconcileUsage("incoming", ROW, WINDOW), {
        consumes: { credit: "default", amount: 0.0025 },
    });
    assertEquals(await resource.reconcileUsage("outgoing", ROW, WINDOW), {
        consumes: { credit: "default", amount: 0.004 },
    });
    assertEquals(await resource.reconcileUsage("storage", ROW, WINDOW), {
        consumes: { credit: "default", amount: 0.000125 },
    });
    assertEquals(await resource.reconcileUsage("incoming", ROW, WINDOW), {
        consumes: { credit: "default", amount: 0.0025 },
    });
});

async function boundaryResource(
    respond: (url: URL, method: string) => Response,
) {
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (request, init) => {
                const url = new URL(String(request));
                assertEquals(url.origin, "https://app.sendmux.ai");
                return Promise.resolve(respond(url, init?.method ?? "GET"));
            },
        }),
    });
    return await engine.loadResource(await testResourceUnit("sendmux/mailbox"));
}

function finalUsage() {
    return {
        data: {
            mailbox_id: ROW.externalId,
            start: WINDOW.startIso,
            end: WINDOW.endIso,
            currency: "USD",
            state: "final",
            incoming: { state: "final", posted_amount: "0.000000" },
            outgoing: { state: "final", posted_amount: "0.000001" },
            storage: { state: "final", posted_amount: "12.345678" },
        },
    };
}

async function usageResource({ body, status = 200 }: {
    body: Json;
    status?: number;
}) {
    return await boundaryResource((url, method) => {
        assertEquals(method, "GET");
        assertEquals(url.pathname, "/api/v1/mailboxes/mbx_owned/usage");
        assertEquals(url.searchParams.getAll("start"), [WINDOW.startIso]);
        assertEquals(url.searchParams.getAll("end"), [WINDOW.endIso]);
        return Response.json(body, { status });
    });
}

Deno.test("sendmux resource verify distinguishes active missing and retriable failures", async () => {
    for (const status of [200, 202, 404, 403, 503]) {
        const resource = await boundaryResource((url, method) => {
            assertEquals(method, "GET");
            assertEquals(url.pathname, "/api/v1/mailboxes/mbx_owned");
            return Response.json({}, { status });
        });
        if (status === 404) {
            assertEquals(await resource.verify(ROW), {
                active: false,
                inactiveReason: "http_404",
            });
        } else if (status < 300) {
            assertEquals(await resource.verify(ROW), { active: true });
        } else {
            const error = await assertRejects(
                () => resource.verify(ROW),
                EngineError,
                "Inbox verification failed",
            );
            assertEquals(error.code, "RESOURCE_OP_FAILED");
            assert(error.retriable);
        }
    }
});

Deno.test("sendmux resource refresh uses authoritative email and preserves missing and failure outcomes", async () => {
    for (const status of [200, 404, 503]) {
        const resource = await boundaryResource((url, method) => {
            assertEquals(method, "GET");
            assertEquals(url.pathname, "/api/v1/mailboxes/mbx_owned");
            return Response.json({ data: { email: "updated@example.com" } }, {
                status,
            });
        });
        if (status === 200) {
            assertEquals(await resource.refresh(ROW), {
                active: true,
                patch: { email: "updated@example.com" },
            });
        } else if (status === 404) {
            assertEquals(await resource.refresh(ROW), { active: false });
        } else {
            const error = await assertRejects(
                () => resource.refresh(ROW),
                EngineError,
                "Inbox refresh failed",
            );
            assertEquals(error.code, "RESOURCE_OP_FAILED");
            assert(error.retriable);
        }
    }
});

Deno.test("sendmux resource release accepts gone inboxes and keeps teardown failures retryable", async () => {
    for (const status of [410, 503]) {
        const resource = await boundaryResource((url, method) => {
            assertEquals(method, "DELETE");
            assertEquals(url.pathname, "/api/v1/mailboxes/mbx_owned");
            return Response.json({}, { status });
        });
        if (status === 410) {
            assertEquals(await resource.release(ROW), { released: true });
            assertEquals(await resource.release(ROW), { released: true });
        } else {
            const error = await assertRejects(
                () => resource.release(ROW),
                EngineError,
                "Inbox release failed",
            );
            assertEquals(error.code, "RESOURCE_OP_FAILED");
            assert(error.retriable);
        }
    }
});

const LINES = ["incoming", "outgoing", "storage"] as const;

Deno.test("sendmux resource meter keeps each cumulative posted line on repeated and postrelease reads", async () => {
    const body = finalUsage();
    const amounts = { incoming: 0, outgoing: 0.000001, storage: 12.345678 };
    const resource = await boundaryResource((url, method) => {
        if (method === "DELETE") {
            assertEquals(url.pathname, "/api/v1/mailboxes/mbx_owned");
            return Response.json({ deleted: true, id: ROW.externalId });
        }
        assertEquals(method, "GET");
        assertEquals(url.pathname, "/api/v1/mailboxes/mbx_owned/usage");
        assertEquals(url.searchParams.get("start"), WINDOW.startIso);
        assertEquals(url.searchParams.get("end"), WINDOW.endIso);
        return Response.json(body);
    });
    for (const phase of ["before", "released", "repeated"]) {
        if (phase === "released") {
            assertEquals(await resource.release(ROW), { released: true });
        }
        for (const line of LINES) {
            assertEquals(await resource.reconcileUsage(line, ROW, WINDOW), {
                consumes: {
                    credit: "default",
                    amount: amounts[line],
                },
            });
        }
    }
});

Deno.test("sendmux resource meter rejects mismatched or unfinished windows for every line", async () => {
    const mismatches = [
        ["mailbox_id", "mbx_foreign"],
        ["start", "2026-09-01T00:00:00.001Z"],
        ["end", "2026-09-02T00:00:00.001Z"],
        ["currency", "AUD"],
        ["state", "pending"],
    ] as const;
    for (const line of LINES) {
        for (const [field, value] of mismatches) {
            const body = finalUsage();
            body.data[field] = value;
            const resource = await usageResource({ body });
            await assertRejects(
                () => resource.reconcileUsage(line, ROW, WINDOW),
                EngineError,
                "not final or does not match",
            );
        }
        const body = finalUsage();
        body.data[line].state = "pending";
        const resource = await usageResource({ body });
        await assertRejects(
            () => resource.reconcileUsage(line, ROW, WINDOW),
            EngineError,
            "not final or does not match",
        );
    }
});

Deno.test("sendmux resource meter rejects invalid posted amounts instead of accepting zero", async () => {
    for (const line of LINES) {
        for (
            const amount of [
                "0",
                "0.00000",
                "0.0000000",
                "-0.000001",
                "1e-6",
                "NaN",
                "9".repeat(310) + ".000000",
            ]
        ) {
            const body = finalUsage();
            body.data[line].posted_amount = amount;
            const resource = await usageResource({ body });
            await assertRejects(
                () => resource.reconcileUsage(line, ROW, WINDOW),
                EngineError,
                "Invalid posted inbox cost",
            );
        }
        const invalidReadings: Json[] = [
            { state: "final" },
            { state: "final", posted_amount: null },
            { state: "final", posted_amount: 0 },
        ];
        for (const reading of invalidReadings) {
            const body = finalUsage();
            const resource = await usageResource({
                body: {
                    ...body,
                    data: { ...body.data, [line]: reading },
                },
            });
            await assertRejects(
                () => resource.reconcileUsage(line, ROW, WINDOW),
                EngineError,
            );
        }
    }
});

Deno.test("sendmux resource meter keeps failed upstream cost reads retryable for every line", async () => {
    for (const line of LINES) {
        for (const status of [403, 503]) {
            const resource = await usageResource({ body: {}, status });
            const error = await assertRejects(
                () => resource.reconcileUsage(line, ROW, WINDOW),
                EngineError,
                "Inbox cost read failed",
            );
            assertEquals(error.code, "RESOURCE_OP_FAILED");
            assert(error.retriable);
        }
    }
});
