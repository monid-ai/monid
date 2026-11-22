import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json, UsageModelKind } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const root = fromFileUrl(new URL("./endpoints/", import.meta.url));

for (
    const scenario of [
        {
            endpoint: "bounties",
            folder: "list-bounties",
            fixture: "empty-list",
            input: {},
            status: 200,
        },
        {
            endpoint: "bounties/{id}",
            folder: "get-bounty",
            fixture: "not-found",
            input: { pathParams: { id: "bt-000000000000" } },
            status: 404,
        },
        {
            endpoint: "bounties",
            folder: "list-bounties",
            fixture: "synthetic-list",
            input: {
                queryParams: {
                    language: "TypeScript",
                    min_reward: 25,
                    query: "parser",
                    sort: "reward",
                    limit: 25,
                },
            },
            status: 200,
        },
        {
            endpoint: "bounties/{id}",
            folder: "get-bounty",
            fixture: "synthetic-detail",
            input: { pathParams: { id: "bt-012345abcdef" } },
            status: 200,
        },
    ]
) {
    Deno.test(`omakase-box ${scenario.fixture}: public passthrough and FREE usage`, async () => {
        const unit = await testSealedUnit(`omakase-box#${scenario.endpoint}`);
        const fixture = await loadFixture(
            `${root}${scenario.folder}/fixtures/${scenario.fixture}.json`,
        );
        const result = await runEndpoint({
            unit,
            input: scenario.input,
            mode: "replay",
            fixture,
        });
        assertEquals(unit.doc.auth.credentials.properties, {});
        assertEquals(unit.doc.meta.categories, ["jobs"]);
        assertEquals(unit.doc.usage.model.kind, UsageModelKind.FREE);
        assertEquals(result.httpStatus, scenario.status);
        assertEquals(result.isProviderError, scenario.status >= 400);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, fixture.calls[0].res.body);
    });
}

Deno.test("omakase-box list: invalid filters rejected before transport", async () => {
    const unit = await testSealedUnit("omakase-box#bounties");
    for (
        const queryParams of [
            { limit: 0 },
            { limit: 26 },
            { limit: 1.5 },
            { sort: "oldest" },
            { min_reward: -1 },
            { min_reward: 0.5 },
            { query: "a".repeat(101) },
            { unknown: "filter" },
        ] as Record<string, Json>[]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { queryParams }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
});

const importIssue = "https://github.com/example/parser/issues/7";
const importFixtures = fromFileUrl(new URL("./fixtures/", import.meta.url));

for (
    const [shape, status] of [
        ["pending", 200],
        ["refused", 400],
        ["conflict", 409],
        ["limited", 429],
        ["unavailable", 503],
    ] as const
) {
    Deno.test(`omakase-box import ${shape}: POST passthrough and FREE usage`, async () => {
        const unit = await testSealedUnit("omakase-box#bounties/import");
        const fixture = await loadFixture(
            `${importFixtures}synthetic-import-${shape}.json`,
        );
        const result = await runEndpoint({
            unit,
            input: { body: { issue: importIssue, reward: 25 } },
            mode: "replay",
            fixture,
        });
        assertEquals(unit.doc.request, {
            method: "POST",
            url: "https://omakasebox.dev/api/agents/import",
        });
        assertEquals(unit.doc.auth.credentials.properties, {});
        assertEquals(unit.doc.usage.model.kind, UsageModelKind.FREE);
        assertEquals(unit.doc.meta.categories, ["jobs"]);
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, status >= 400);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, fixture.calls[0].res.body);
    });
}

Deno.test("omakase-box import: exact JSON body and no authentication at egress", async () => {
    const unit = await testSealedUnit("omakase-box#bounties/import");
    const fixture = await loadFixture(
        `${importFixtures}synthetic-import-pending.json`,
    );
    let calls = 0;
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({}),
            fetch: (url, init) => {
                calls++;
                assertEquals(
                    String(url),
                    "https://omakasebox.dev/api/agents/import",
                );
                assertEquals(init?.method, "POST");
                assertEquals(JSON.parse(String(init?.body)), {
                    issue: importIssue,
                    reward: 25,
                });
                const headers = new Headers(init?.headers);
                assertEquals(headers.get("content-type"), "application/json");
                assertEquals(headers.has("authorization"), false);
                assertEquals(headers.has("cookie"), false);
                assertEquals(headers.has("origin"), false);
                return Promise.resolve(
                    Response.json(fixture.calls[0].res.body),
                );
            },
        }),
    }).load(unit);
    const result = await loaded.run({
        body: { issue: importIssue, reward: 25 },
    });
    assertEquals(calls, 1);
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("omakase-box import: empty, malformed and extra inputs rejected before transport", async () => {
    const unit = await testSealedUnit("omakase-box#bounties/import");
    for (
        const body of [
            {},
            null,
            [],
            { issue: importIssue },
            { reward: 25 },
            { issue: importIssue, reward: 25, listed_by: "agent" },
            ...[0, -1, 1.5, 100001, "25", null].map((reward) => ({
                issue: importIssue,
                reward,
            })),
            ...[
                "",
                "http://github.com/example/parser/issues/7",
                "https://github.com.example.com/example/parser/issues/7",
                "https://github.com@example.com/example/parser/issues/7",
                "https://gitlab.com/example/parser/issues/7",
                "https://github.com/example/parser/pull/7",
                "https://github.com/example/parser/issues/nope",
                "https://github.com/example/parser/issues/1234567890",
                "https://github.com/example/parser/issues/7?token=example",
                "https://github.com/example/parser/issues/7#comment",
            ].map((issue) => ({ issue, reward: 25 })),
        ] as Json[]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertRejects(
        () => runEndpoint({ unit, input: {}, mode: "replay" }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test("omakase-box import: inclusive reward bounds and trailing issue slash accepted", async () => {
    const unit = await testSealedUnit("omakase-box#bounties/import");
    for (const reward of [1, 100000]) {
        const body = { issue: importIssue + "/", reward };
        const fixture = await loadFixture(
            `${importFixtures}synthetic-import-pending.json`,
        );
        fixture.calls[0].req.body = body;
        fixture.calls[0].res.body = {
            listed: "bt-012345abcdef",
            pending: true,
            approve_with: `omakase approve bt-012345abcdef $${reward}`,
            approve_on: body.issue,
            next:
                "Post the approval line from an authorized repository account.",
        };
        const result = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.output, fixture.calls[0].res.body);
    }
});

Deno.test("omakase-box descriptions: instruct the agent on posting, approval and solving", async () => {
    for (const endpoint of ["bounties", "bounties/{id}", "bounties/import"]) {
        const unit = await testSealedUnit(`omakase-box#${endpoint}`);
        const description = unit.doc.meta.description ?? "";
        for (
            const instruction of [
                "To post work:",
                "approve_with",
                "OWNER/COLLABORATOR",
                "15 minutes",
                "14 days",
                "human repository owner/operator pays",
                "answer/attempt",
                "box-bounty/<id>",
                "Fixes #N",
                "reserves nothing",
                "ready for review",
                "No stated reward guarantees",
            ]
        ) {
            assertStringIncludes(description, instruction);
        }
        assertEquals(
            description.includes("Monid cannot post work"),
            false,
        );
    }
});

Deno.test("omakase-box detail: missing or malformed id rejected before transport", async () => {
    const unit = await testSealedUnit("omakase-box#bounties/{id}");
    for (
        const input of [{}, { pathParams: { id: "../private" } }, {
            pathParams: { id: "123" },
        }]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
});
