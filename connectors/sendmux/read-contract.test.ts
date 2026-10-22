import { assertEquals, assertRejects } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import { fixtureReader, testSealedUnit } from "@shared/testing";

const cases: Array<{
    id: string;
    path: string;
    queryParams: Record<string, string | number | boolean>;
    invalid: Record<string, string | number | boolean>;
}> = [
    {
        id: "sendmux#list-messages",
        path: "/api/v1/mailbox/messages",
        queryParams: {
            mailbox_id: "mbx_owned",
            limit: 2,
            cc: "copied@example.com",
            bcc: "hidden@example.com",
            header_name: "X-Project",
            header_value: "invoices",
            min_size_bytes: 0,
            max_size_bytes: 1000,
            not_keyword: "$seen",
            has_attachment: true,
            is_unread: false,
        },
        invalid: { min_size_bytes: -1 },
    },
    {
        id: "sendmux#search-messages",
        path: "/api/v1/mailbox/messages/search-snippets",
        queryParams: {
            mailbox_id: "mbx_owned",
            q: "invoice",
            limit: 2,
            cc: "copied@example.com",
            bcc: "hidden@example.com",
            header_name: "X-Project",
            header_value: "invoices",
            min_size_bytes: 0,
            max_size_bytes: 1000,
            not_keyword: "$seen",
            has_attachment: false,
            is_unread: true,
        },
        invalid: { has_attachment: "yes" },
    },
    {
        id: "sendmux#list-threads",
        path: "/api/v1/mailbox/threads",
        queryParams: {
            mailbox_id: "mbx_owned",
            limit: 2,
            after: "2026-09-01T00:00:00.000Z",
            before: "2026-09-02T00:00:00.000Z",
            has_attachment: true,
            is_unread: false,
        },
        invalid: { has_attachment: "yes" },
    },
    {
        id: "sendmux#changes",
        path: "/api/v1/mailbox/changes",
        queryParams: {
            mailbox_id: "mbx_owned",
            limit: 2,
            types: "submissions,identities,quotas",
            submissions_since_state: "submissions_2",
            identities_since_state: "identities_2",
            quotas_since_state: "quotas_2",
        },
        invalid: { quotas_since_state: 2 },
    },
];

for (const entry of cases) {
    Deno.test(
        entry.id + " preserves native filters and blocks foreign selectors",
        async () => {
            let calls = 0;
            const engine = new Engine({
                transport: directTransport({
                    params: () => Promise.resolve({ apiKey: "test-key" }),
                    fetch: (request) => {
                        calls++;
                        const url = new URL(String(request));
                        assertEquals(url.origin, "https://app.sendmux.ai");
                        assertEquals(url.pathname, entry.path);
                        assertEquals(
                            Object.fromEntries(url.searchParams),
                            Object.fromEntries(
                                Object.entries(entry.queryParams)
                                    .map((
                                        [key, value],
                                    ) => [key, String(value)]),
                            ),
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
            const loaded = await engine.load(await testSealedUnit(entry.id));
            assertEquals(
                (await loaded.run({ queryParams: entry.queryParams }))
                    .httpStatus,
                200,
            );
            assertEquals(calls, 1);
            await assertRejects(
                () =>
                    loaded.run({
                        queryParams: { ...entry.queryParams, ...entry.invalid },
                    }),
                Error,
                "INVALID_INPUT",
            );
            const foreign = await loaded.run({
                queryParams: {
                    ...entry.queryParams,
                    mailbox_id: "mbx_foreign",
                },
            });
            assertEquals(foreign.httpStatus, 404);
            assertEquals(calls, 1);
        },
    );
}
