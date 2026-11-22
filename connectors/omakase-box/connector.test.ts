import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
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
