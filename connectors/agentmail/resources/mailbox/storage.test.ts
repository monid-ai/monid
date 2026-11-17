import { assertEquals, assertRejects } from "@std/assert";
import type { Json, UsageWindow } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import { testResourceUnit } from "@shared/testing";
import { fixture, MAILBOX } from "../../test-data.ts";

const ID = "agentmail/mailbox";
const GIB = 1024 ** 3;
const WINDOW: UsageWindow = {
    startIso: "2026-02-01T00:00:00Z",
    endIso: "2026-02-15T00:00:00Z",
    periodEndIso: "2026-03-01T00:00:00Z",
};
const SERIES = { storage_bytes: [{ value: GIB }] };

async function meterReply(body: Json = SERIES, status = 200) {
    const calls: { url: URL; method: string; authorization: string | null }[] =
        [];
    const resource = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (url, init) => {
                calls.push({
                    url: new URL(String(url)),
                    method: init?.method ?? "GET",
                    authorization: new Headers(init?.headers).get(
                        "authorization",
                    ),
                });
                return Promise.resolve(
                    new Response(JSON.stringify(body), {
                        status,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
    }).loadResource(await testResourceUnit(ID));
    return { resource, calls };
}

function reading(amount: number) {
    return {
        consumes: { credit: "default", amount },
        vendorConsumes: { credit: "default", amount: 0 },
    };
}

Deno.test(`${ID}: partial storage uses the full month and arithmetic mean of samples`, async () => {
    const f = await fixture("synthetic-storage-metrics");
    const { resource, calls } = await meterReply(f.calls[0].res.body);
    assertEquals(
        await resource.reconcileUsage("storage", MAILBOX, WINDOW),
        reading(0.5),
    );
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "GET");
    assertEquals(calls[0].authorization, "Bearer test-key");
    assertEquals(calls[0].url.origin, "https://api.agentmail.to");
    assertEquals(calls[0].url.pathname, "/v0/inboxes/mbx-1/metrics/usage");
    assertEquals(Object.fromEntries(calls[0].url.searchParams), {
        usage_types: "storage_bytes",
        period: "3600",
        start: WINDOW.startIso,
        end: WINDOW.endIso,
        limit: "1000",
    });
});

Deno.test(`${ID}: 28/29/30/31-day and creation-anchored periods all bill exactly one full month`, async () => {
    const { resource } = await meterReply();
    for (
        const [startIso, periodEndIso] of [
            ["2026-02-01T00:00:00Z", "2026-03-01T00:00:00Z"],
            ["2028-02-01T00:00:00Z", "2028-03-01T00:00:00Z"],
            ["2026-04-01T00:00:00Z", "2026-05-01T00:00:00Z"],
            ["2026-07-01T00:00:00Z", "2026-08-01T00:00:00Z"],
            ["2026-10-27T12:34:56.123Z", "2026-11-27T12:34:56.123Z"],
            ["2026-12-31T12:34:56.123Z", "2027-01-31T12:34:56.123Z"],
        ]
    ) {
        assertEquals(
            await resource.reconcileUsage("storage", MAILBOX, {
                startIso,
                endIso: periodEndIso,
                periodEndIso,
            }),
            reading(1),
        );
    }
});

Deno.test(`${ID}: the same fourteen days cost different fractions in February and July`, async () => {
    const { resource } = await meterReply();
    assertEquals(
        await resource.reconcileUsage("storage", MAILBOX, WINDOW),
        reading(0.5),
    );
    assertEquals(
        await resource.reconcileUsage("storage", MAILBOX, {
            startIso: "2026-07-01T00:00:00Z",
            endIso: "2026-07-15T00:00:00Z",
            periodEndIso: "2026-08-01T00:00:00Z",
        }),
        reading(0.4516),
    );
});

Deno.test(`${ID}: delayed teardown tails are not clamped to period end`, async () => {
    const { resource } = await meterReply();
    assertEquals(
        await resource.reconcileUsage("storage", MAILBOX, {
            ...WINDOW,
            endIso: "2026-03-02T00:00:00Z",
        }),
        reading(1.0357),
    );
});

Deno.test(`${ID}: storage quantities round to four decimals without whole-unit ceiling`, async () => {
    const { resource } = await meterReply({
        storage_bytes: [{ value: 123456789 }],
    });
    assertEquals(
        await resource.reconcileUsage("storage", MAILBOX, {
            ...WINDOW,
            endIso: WINDOW.periodEndIso,
        }),
        reading(0.115),
    );
});

Deno.test(`${ID}: bucket size changes only after 1000 hours`, async () => {
    const { resource, calls } = await meterReply();
    for (
        const [endIso, expected] of [
            ["2026-03-14T16:00:00.000Z", "3600"],
            ["2026-03-14T16:00:00.001Z", "86400"],
        ]
    ) {
        await resource.reconcileUsage("storage", MAILBOX, {
            ...WINDOW,
            endIso,
        });
        assertEquals(calls.at(-1)?.url.searchParams.get("period"), expected);
    }
});

Deno.test(`${ID}: valid empty/zero storage reads bill zero, zero elapsed skips IO`, async () => {
    for (const storage_bytes of [[], [{ value: 0 }]]) {
        const { resource } = await meterReply({ storage_bytes });
        assertEquals(
            await resource.reconcileUsage("storage", MAILBOX, WINDOW),
            reading(0),
        );
    }
    const { resource, calls } = await meterReply({}, 503);
    assertEquals(
        await resource.reconcileUsage("storage", MAILBOX, {
            ...WINDOW,
            endIso: WINDOW.startIso,
        }),
        reading(0),
    );
    assertEquals(calls, []);
});

Deno.test(`${ID}: unavailable or unreadable metrics throw instead of settling zero`, async () => {
    for (
        const [status, body] of [
            [503, {}],
            [404, {}],
            [200, {}],
            [200, { storage_bytes: null }],
            [200, { storage_bytes: {} }],
            [200, { storage_bytes: [null] }],
            [200, { storage_bytes: [{ value: "1073741824" }] }],
            [200, { storage_bytes: [{ value: -1 }] }],
            [200, { storage_bytes: [{ value: 1 }, { unexpected: 2 }] }],
            [200, { storage_bytes: [{ value: 1e308 }, { value: 1e308 }] }],
        ] as [number, Json][]
    ) {
        const { resource } = await meterReply(body, status);
        await assertRejects(
            () => resource.reconcileUsage("storage", MAILBOX, WINDOW),
            Error,
            "RESOURCE_OP_FAILED",
        );
    }
});

Deno.test(`${ID}: missing full-period context or invalid boundaries fail before IO`, async () => {
    const { resource, calls } = await meterReply();
    const { periodEndIso: _, ...oldWindow } = WINDOW;
    for (
        const window of [
            oldWindow,
            { ...WINDOW, periodEndIso: WINDOW.startIso },
            { ...WINDOW, endIso: "2026-01-31T00:00:00Z" },
            { ...WINDOW, periodEndIso: "not-a-date" },
        ]
    ) {
        await assertRejects(
            () =>
                resource.reconcileUsage(
                    "storage",
                    MAILBOX,
                    window as UsageWindow,
                ),
            Error,
            "FN_CONTRACT",
        );
    }
    await assertRejects(
        () =>
            resource.reconcileUsage("storage", {
                ...MAILBOX,
                externalId: "foreign@example.test",
            }, WINDOW),
        Error,
        "RESOURCE_OP_FAILED",
    );
    assertEquals(calls, []);
});

Deno.test(`${ID}: stored native IDs are encoded as a single path segment`, async () => {
    const { resource, calls } = await meterReply();
    const row = {
        ...MAILBOX,
        data: {
            ...MAILBOX.data as Record<string, Json>,
            upstreamInboxId: "native/id?x=1",
        },
    };
    await resource.reconcileUsage("storage", row, WINDOW);
    assertEquals(
        calls[0].url.pathname,
        "/v0/inboxes/native%2Fid%3Fx%3D1/metrics/usage",
    );
});

Deno.test(`${ID}: storage can be read after successful upstream teardown`, async () => {
    const calls: string[] = [];
    const resource = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (url, init) => {
                const method = init?.method ?? "GET";
                calls.push(method);
                return Promise.resolve(
                    method === "DELETE"
                        ? new Response(null, { status: 204 })
                        : new Response(
                            JSON.stringify(
                                String(url).includes("/metrics/usage")
                                    ? SERIES
                                    : {
                                        inbox_id: "mbx-1",
                                        email: MAILBOX.externalId,
                                    },
                            ),
                            {
                                status: 200,
                                headers: { "content-type": "application/json" },
                            },
                        ),
                );
            },
        }),
    }).loadResource(await testResourceUnit(ID));
    await resource.release(MAILBOX);
    assertEquals(
        await resource.reconcileUsage("storage", MAILBOX, WINDOW),
        reading(0.5),
    );
    assertEquals(calls, ["GET", "DELETE", "GET"]);
});
