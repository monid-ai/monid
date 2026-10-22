import { assertEquals, assertRejects } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import { fixtureReader, testSealedUnit } from "@shared/testing";

const sendId = "sendmux#mailbox/drafts/{draftId}/send";
const controlId = "sendmux#mailbox/drafts/{draftId}/schedule";
const scheduledTimes = [
    "2026-09-01T00:00:00Z",
    "2026-09-01T00:00:00.1Z",
    "2026-09-01T00:00:00.12Z",
    "2026-09-01T00:00:00.123Z",
    "2026-09-01T12:00:00.123+12:00",
];

for (const id of [sendId, controlId]) {
    Deno.test(
        id + " keeps valid schedule bodies and immediate/cancel optionality",
        async () => {
            const bodies: Array<Record<string, string | number | null>> = [
                id === sendId ? { expected_revision: 2 } : {
                    expected_revision: 2,
                    expected_schedule_version: 0,
                    scheduled_for: null,
                },
                ...(id === sendId
                    ? [{ expected_revision: 2, expected_schedule_version: 0 }]
                    : []),
                ...scheduledTimes.map((scheduled_for) => ({
                    expected_revision: 2,
                    expected_schedule_version: 0,
                    scheduled_for,
                })),
            ];
            let calls = 0;
            const engine = new Engine({
                transport: directTransport({
                    params: () => Promise.resolve({ apiKey: "test-key" }),
                    fetch: (request, init) => {
                        assertEquals(
                            String(request),
                            "https://app.sendmux.ai/api/v1/mailbox/drafts/draft_1/" +
                                (id === sendId ? "send" : "schedule") +
                                "?mailbox_id=mbx_owned",
                        );
                        assertEquals(
                            init?.method,
                            id === sendId ? "POST" : "PATCH",
                        );
                        assertEquals(
                            JSON.parse(String(init?.body)),
                            bodies[calls++],
                        );
                        return Promise.resolve(
                            Response.json({ ok: true, data: {} }),
                        );
                    },
                }),
                resources: fixtureReader([{
                    resource: "sendmux/mailbox",
                    externalId: "mbx_owned",
                    data: { email: "agent@example.com" },
                }]),
                scopeKey: "test-scope",
            });
            const loaded = await engine.load(await testSealedUnit(id));
            for (const body of bodies) {
                const result = await loaded.run({
                    pathParams: { draftId: "draft_1" },
                    queryParams: { mailbox_id: "mbx_owned" },
                    body,
                });
                assertEquals(result.httpStatus, 200);
            }
            assertEquals(calls, bodies.length);
        },
    );
}

const invalidCases: Array<{
    title: string;
    id: string;
    body: Record<string, string | number>;
}> = [
    {
        title:
            "scheduled send requires the reviewed schedule version before IO",
        id: sendId,
        body: {
            expected_revision: 2,
            scheduled_for: "2026-09-01T00:00:00.123Z",
        },
    },
    {
        title: "scheduled send rejects precision above milliseconds before IO",
        id: sendId,
        body: {
            expected_revision: 2,
            expected_schedule_version: 0,
            scheduled_for: "2026-09-01T00:00:00.1234Z",
        },
    },
    {
        title:
            "schedule control rejects precision above milliseconds before IO",
        id: controlId,
        body: {
            expected_revision: 2,
            expected_schedule_version: 0,
            scheduled_for: "2026-09-01T00:00:00.1234Z",
        },
    },
];

for (const entry of invalidCases) {
    Deno.test("sendmux " + entry.title, async () => {
        let calls = 0;
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "test-key" }),
                fetch: () => {
                    calls++;
                    return Promise.resolve(
                        Response.json({ ok: true, data: {} }),
                    );
                },
            }),
            resources: fixtureReader([{
                resource: "sendmux/mailbox",
                externalId: "mbx_owned",
                data: { email: "agent@example.com" },
            }]),
            scopeKey: "test-scope",
        });
        const loaded = await engine.load(await testSealedUnit(entry.id));
        const input = {
            pathParams: { draftId: "draft_1" },
            queryParams: { mailbox_id: "mbx_owned" },
            body: entry.body,
        };
        await assertRejects(() => loaded.run(input), Error, "INVALID_INPUT");
        await assertRejects(
            () =>
                loaded.run({
                    ...input,
                    body: {
                        expected_revision: 2,
                        expected_schedule_version: 0,
                        scheduled_for: "2026-09-01T00:00:00.123",
                    },
                }),
            Error,
            "INVALID_INPUT",
        );
        assertEquals(calls, 0);
    });
}
