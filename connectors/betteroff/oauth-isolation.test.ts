import type { Json, RunInput } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, testSealedUnit } from "@shared/testing";

// These tests exercise the compiled connector and the public transport seam.
// Caller identity, connections, and tokens are synthetic host stand-ins. They
// do not implement or verify Monid's hosted OAuth storage or refresh protocol.
const fixtureRoot = fromFileUrl(new URL("./fixtures/", import.meta.url));
const cases: { endpoint: string; fixture: string; input: RunInput }[] = [
    {
        endpoint: "get_setup_status",
        fixture: "setup-status",
        input: { body: {} },
    },
    {
        endpoint: "get_cash_flow",
        fixture: "cash-flow",
        input: { body: { startDate: null, endDate: null } },
    },
    { endpoint: "list_recurring", fixture: "recurring", input: { body: {} } },
];

for (const { endpoint, fixture: fixtureName, input } of cases) {
    Deno.test(`betteroff#${endpoint}: caller-bound credentials isolate concurrent runs in one workspace`, async () => {
        const unit = await testSealedUnit(`betteroff#${endpoint}`);
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-${fixtureName}.json`,
        );
        const tokens = new Map([
            ["synthetic-a-token", "household-a"],
            ["synthetic-b-token", "household-b"],
        ]);
        let arrived = 0;
        let release!: () => void;
        const bothResolving = new Promise<void>((resolve) => {
            release = resolve;
        });
        const seen: string[] = [];
        const makeRun = async (token: string) => {
            const engine = new Engine({
                scopeKey: "synthetic-shared-workspace",
                transport: directTransport({
                    params: async (provider, fields) => {
                        assertEquals(provider, "betteroff");
                        assertEquals(fields, ["accessToken"]);
                        if (++arrived === 2) release();
                        await bothResolving;
                        return { accessToken: token };
                    },
                    fetch: async (url, init) => {
                        assertEquals(
                            String(url),
                            "https://api.betteroff.finance/mcp",
                        );
                        assertEquals(init?.redirect, "manual");
                        const sent = new Headers(init?.headers).get(
                            "Authorization",
                        )?.slice(7);
                        const household = tokens.get(sent ?? "");
                        assert(household);
                        seen.push(household);
                        const body = structuredClone(
                            fixture.calls[0].res.body,
                        ) as {
                            result: { structuredContent: Record<string, Json> };
                        };
                        // Distinct synthetic result markers; no real household identifiers.
                        body.result.structuredContent.requestId = household;
                        assertEquals(JSON.parse(String(init?.body)), {
                            jsonrpc: "2.0",
                            id: 1,
                            method: "tools/call",
                            params: {
                                name: `betteroff_${endpoint}`,
                                arguments: input.body,
                            },
                        });
                        return new Response(JSON.stringify(body), {
                            status: 200,
                        });
                    },
                }),
            });
            return (await engine.load(unit)).run(input);
        };
        const results = await Promise.all([
            makeRun("synthetic-a-token"),
            makeRun("synthetic-b-token"),
        ]);
        assertEquals(
            results.map((r) => (r.output as Record<string, Json>).requestId),
            [
                "household-a",
                "household-b",
            ],
        );
        assertEquals(seen.sort(), ["household-a", "household-b"]);
        for (const result of results) {
            assertEquals(result.isProviderError, false);
            assertEquals(result.usage, { credits: {}, evidence: {} });
            for (const token of tokens.keys()) {
                assert(!JSON.stringify(result).includes(token));
            }
        }
    });

    Deno.test(`betteroff#${endpoint}: host connection denial prevents egress`, async () => {
        const unit = await testSealedUnit(`betteroff#${endpoint}`);
        for (
            const reason of [
                "foreign-owner",
                "disconnected",
                "lookup-unavailable",
            ]
        ) {
            let calls = 0;
            const engine = new Engine({
                transport: directTransport({
                    params: () =>
                        Promise.reject(
                            new Error(`Synthetic host denial: ${reason}`),
                        ),
                    fetch: () => {
                        calls++;
                        throw new Error("Must not fetch");
                    },
                }),
            });
            await assertRejects(
                () => engine.load(unit).then((run) => run.run(input)),
                Error,
                reason,
            );
            assertEquals(calls, 0);
        }
    });

    Deno.test(`betteroff#${endpoint}: model identity overrides fail before credential lookup`, async () => {
        const unit = await testSealedUnit(`betteroff#${endpoint}`);
        let resolutions = 0;
        let fetches = 0;
        const engine = new Engine({
            transport: directTransport({
                params: async () => {
                    resolutions++;
                    return { accessToken: "synthetic-token" };
                },
                fetch: () => {
                    fetches++;
                    throw new Error("Must not fetch");
                },
            }),
        });
        const run = await engine.load(unit);
        for (
            const key of [
                "userId",
                "householdId",
                "connectionId",
                "accessToken",
                "refreshToken",
                "clientSecret",
            ]
        ) {
            await assertRejects(
                () =>
                    run.run({
                        body: {
                            ...(input.body as Record<string, Json>),
                            [key]: "synthetic-other",
                        },
                    }),
                Error,
                "INVALID_INPUT",
            );
        }
        assertEquals(resolutions, 0);
        assertEquals(fetches, 0);
    });
}

Deno.test("betteroff: each dispatch re-resolves the host token, and disconnect stops a loaded endpoint", async () => {
    const unit = await testSealedUnit("betteroff#get_setup_status");
    const fixture = await loadFixture(
        `${fixtureRoot}synthetic-setup-status.json`,
    );
    let token: string | undefined = "synthetic-initial-token";
    const sent: string[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: async () => {
                if (!token) {
                    throw new Error("Synthetic connection disconnected");
                }
                return { accessToken: token };
            },
            fetch: async (_url, init) => {
                sent.push(new Headers(init?.headers).get("Authorization")!);
                return new Response(JSON.stringify(fixture.calls[0].res.body), {
                    status: 200,
                });
            },
        }),
    });
    const run = await engine.load(unit);
    await run.run({ body: {} });
    // Host supplies a replacement token for the same synthetic grant. This is
    // credential re-resolution, not a test of OAuth refresh rotation or locks.
    token = "synthetic-replacement-token";
    await run.run({ body: {} });
    token = undefined;
    await assertRejects(() => run.run({ body: {} }), Error, "disconnected");
    assertEquals(sent, [
        "Bearer synthetic-initial-token",
        "Bearer synthetic-replacement-token",
    ]);
});
