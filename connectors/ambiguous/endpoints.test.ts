import { assert, assertEquals, assertRejects } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    liveSkip,
    loadFixture,
    replayFetch,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import type { Json, RunInput } from "@shared/core";

const ID = "11111111-1111-4111-8111-111111111111";
const content = JSON.stringify({
    type: "doc",
    content: [{
        type: "paragraph",
        content: [{
            type: "text",
            text: "Hello",
            marks: [{ type: "textStyle", attrs: { color: "#123456" } }],
        }],
    }],
});
const cases: {
    endpoint: string;
    method: string;
    path: string;
    input: RunInput;
}[] = [
    { endpoint: "whoami", method: "GET", path: "/api/users/me", input: {} },
    {
        endpoint: "search",
        method: "POST",
        path: "/api/search",
        input: {
            body: { query: "release", modules: ["docs", "tasks"], limit: 5 },
        },
    },
    {
        endpoint: "list-documents",
        method: "GET",
        path: "/api/documents",
        input: {
            queryParams: {
                type: "doc",
                limit: 5,
                cursor: "next-page",
                offset: null,
            },
        },
    },
    {
        endpoint: "create-document",
        method: "POST",
        path: "/api/documents",
        input: { body: { type: "doc", title: "Release plan", content } },
    },
    {
        endpoint: "get-document",
        method: "GET",
        path: `/api/documents/${ID}`,
        input: { pathParams: { id: ID } },
    },
    {
        endpoint: "update-document",
        method: "PATCH",
        path: `/api/documents/${ID}`,
        input: {
            pathParams: { id: ID },
            body: { title: "Updated plan", content },
        },
    },
    {
        endpoint: "list-tasks",
        method: "GET",
        path: "/api/tasks",
        input: { queryParams: { limit: 5, status: "todo" } },
    },
    {
        endpoint: "create-task",
        method: "POST",
        path: "/api/tasks",
        input: {
            body: {
                title: "Review plan",
                priority: "high",
                due_date: "2026-10-01",
            },
        },
    },
    {
        endpoint: "get-task",
        method: "GET",
        path: `/api/tasks/${ID}`,
        input: { pathParams: { id: ID } },
    },
    {
        endpoint: "update-task",
        method: "PATCH",
        path: `/api/tasks/${ID}`,
        input: {
            pathParams: { id: ID },
            body: { status: "done", assignee_id: null, due_date: null },
        },
    },
];

for (const scenario of cases) {
    Deno.test(`ambiguous#${scenario.endpoint}: compiled request preserves inputs, credential injection, and response`, async () => {
        const unit = await testSealedUnit(`ambiguous#${scenario.endpoint}`);
        const fixture = await loadFixture(
            new URL(
                `./fixtures/synthetic-${scenario.method.toLowerCase()}.json`,
                import.meta.url,
            ).pathname,
        );
        const expectedUrl = new URL(`https://app.ambiguous.ai${scenario.path}`);
        for (
            const [name, value] of Object.entries(
                scenario.input.queryParams ?? {},
            )
        ) {
            if (value !== null) {
                expectedUrl.searchParams.set(name, String(value));
            }
        }
        const replay = replayFetch(fixture, {
            "request.url": expectedUrl.toString(),
        });
        let calls = 0;
        const endpoint = await new Engine({
            transport: directTransport({
                params: () =>
                    Promise.resolve({ apiKey: "synthetic-private-credential" }),
                fetch: async (input, init) => {
                    calls++;
                    const url = new URL(String(input));
                    assertEquals(url.origin, "https://app.ambiguous.ai");
                    assertEquals(url.pathname, scenario.path);
                    assertEquals(init?.method, scenario.method);
                    assertEquals(
                        new Headers(init?.headers).get("Authorization"),
                        "Bearer synthetic-private-credential",
                    );
                    assertEquals(
                        new Headers(init?.headers).get("API-Version"),
                        "1",
                    );
                    assertEquals(
                        init?.body ? JSON.parse(String(init.body)) : undefined,
                        scenario.input.body,
                    );
                    for (
                        const [name, value] of Object.entries(
                            scenario.input.queryParams ?? {},
                        )
                    ) {
                        assertEquals(
                            url.searchParams.get(name),
                            value === null ? null : String(value),
                        );
                    }
                    return await replay(input, init);
                },
            }),
        }).load(unit);
        const result = await endpoint.run(scenario.input);
        assertEquals(calls, 1);
        assertEquals(result.httpStatus, fixture.calls[0].res.status);
        assertEquals(result.output, fixture.calls[0].res.body);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert(
            !JSON.stringify(result).includes("synthetic-private-credential"),
        );
    });
}

Deno.test("ambiguous: invalid task and unknown request fields fail before any upstream call", async () => {
    const invalidBodies: Json[] = [{ title: "" }, {
        title: "x",
        api_key: "do-not-send",
    }];
    for (const body of invalidBodies) {
        const unit = await testSealedUnit("ambiguous#create-task");
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "input",
        );
    }
});

Deno.test("ambiguous: authorization errors retain their status and have zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("ambiguous#whoami"),
        input: {},
        mode: "replay",
        fixture: await loadFixture(
            new URL("./fixtures/synthetic-unauthorized.json", import.meta.url)
                .pathname,
        ),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.output, { error: "Unauthorized" });
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "ambiguous#whoami live (credential gated; read only)",
    ignore: liveSkip("ambiguous"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("ambiguous#whoami"),
            input: {},
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        assert(
            result.output && typeof result.output === "object" &&
                !Array.isArray(result.output),
        );
        assert(typeof result.output.workspace_id === "string");
    },
});
