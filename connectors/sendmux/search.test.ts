import { assertEquals, assertRejects } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import { fixtureReader, testSealedUnit } from "@shared/testing";

Deno.test("sendmux search snippets selects exact owned message IDs", async () => {
    let calls = 0;
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (request) => {
                calls++;
                const url = new URL(String(request));
                assertEquals(url.origin, "https://app.sendmux.ai");
                assertEquals(
                    url.pathname,
                    "/api/v1/mailbox/messages/search-snippets",
                );
                assertEquals(Object.fromEntries(url.searchParams), {
                    mailbox_id: "mbx_owned",
                    q: "invoice",
                    message_ids: "msg_1,msg_2",
                    limit: "2",
                });
                return Promise.resolve(Response.json({
                    ok: true,
                    data: { snippets: [], not_found: [], sync_state: null },
                }));
            },
        }),
        resources: fixtureReader([{
            resource: "sendmux/mailbox",
            externalId: "mbx_owned",
            data: { email: "agent@example.com" },
        }]),
        scopeKey: "test-scope",
    });
    const loaded = await engine.load(
        await testSealedUnit("sendmux#search-messages"),
    );
    const result = await loaded.run({
        queryParams: {
            mailbox_id: "mbx_owned",
            q: "invoice",
            message_ids: "msg_1,msg_2",
            limit: 2,
        },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(calls, 1);
});

Deno.test("sendmux search snippets rejects missing search and unsupported paging before IO", async () => {
    let calls = 0;
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => {
                calls++;
                return Promise.resolve(Response.json({ ok: true, data: {} }));
            },
        }),
        resources: fixtureReader([{
            resource: "sendmux/mailbox",
            externalId: "mbx_owned",
            data: { email: "agent@example.com" },
        }]),
        scopeKey: "test-scope",
    });
    const loaded = await engine.load(
        await testSealedUnit("sendmux#search-messages"),
    );
    const invalidQueries: Record<string, string>[] = [
        { mailbox_id: "mbx_owned" },
        { mailbox_id: "mbx_owned", q: "" },
        { mailbox_id: "mbx_owned", q: " " },
        { mailbox_id: "mbx_owned", q: "invoice", thread_id: "thread_1" },
        { mailbox_id: "mbx_owned", q: "invoice", cursor: "cursor_1" },
    ];
    for (const queryParams of invalidQueries) {
        await assertRejects(
            () => loaded.run({ queryParams }),
            Error,
            "INVALID_INPUT",
        );
    }
    assertEquals(calls, 0);
});
