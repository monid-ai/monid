import { cases } from "./test-cases.ts";
import type { Json, RunInput } from "@shared/core";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

const fixtureRoot = fromFileUrl(new URL("./fixtures/", import.meta.url));
const endpoints = cases;

Deno.test("betteroff: all 29 endpoints share auth, lifecycle, and output mapping", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("betteroff#")
    ).sort();
    assertEquals(ids, endpoints.map(({ name }) => `betteroff#${name}`).sort());
    const first = bundle.endpoints[ids[0]];
    assert(first.lifecycle?.start);
    assert(first.output.fromResponse);
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.request.method, "POST");
        assertEquals(doc.request.url, "https://api.betteroff.finance/mcp");
        assertEquals(doc.auth.credentials.required, ["accessToken"]);
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key);
        assertEquals(
            doc.lifecycle?.start?.$fn.key,
            first.lifecycle.start.$fn.key,
        );
        assertEquals(
            doc.output.fromResponse?.$fn.key,
            first.output.fromResponse.$fn.key,
        );
        assertEquals(doc.usage.model, { kind: "FREE" });
        assert(doc.output.schema, `${id} must validate its result`);
    }
    const cashFlow = bundle.endpoints["betteroff#get_cash_flow"];
    const properties = cashFlow.input.schema.body?.properties as Record<
        string,
        { description: string }
    >;
    assert(properties.startDate.description.includes("current month"));
    assert(properties.endDate.description.includes("today"));
});

for (const { name, fixture: fixtureName, input } of endpoints) {
    Deno.test(`betteroff#${name}: sends only the fixed tool, arguments, and resolver credential`, async () => {
        const unit = await testSealedUnit(`betteroff#${name}`);
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-${fixtureName}.json`,
        );
        let calls = 0;
        const engine = new Engine({
            transport: directTransport({
                params: () =>
                    Promise.resolve({ accessToken: "synthetic-token" }),
                fetch: async (url, init) => {
                    calls++;
                    assertEquals(
                        String(url),
                        "https://api.betteroff.finance/mcp",
                    );
                    assertEquals(init?.method, "POST");
                    const headers = new Headers(init?.headers);
                    assertEquals(
                        headers.get("Authorization"),
                        "Bearer synthetic-token",
                    );
                    assertEquals(
                        headers.get("MCP-Protocol-Version"),
                        "2025-03-26",
                    );
                    assertEquals(
                        headers.get("Accept"),
                        "application/json, text/event-stream",
                    );
                    assertEquals(JSON.parse(String(init?.body)), {
                        jsonrpc: "2.0",
                        id: 1,
                        method: "tools/call",
                        params: {
                            name: `betteroff_${name}`,
                            arguments: input.body,
                        },
                    });
                    return new Response(
                        JSON.stringify(fixture.calls[0].res.body),
                        { status: 200 },
                    );
                },
            }),
        });
        const result = await (await engine.load(unit)).run(input);
        assertEquals(result.isProviderError, false);
        assertEquals(calls, 1);
    });

    Deno.test(`betteroff#${name}: missing and empty credentials fail before transport`, async () => {
        const unit = await testSealedUnit(`betteroff#${name}`);
        for (
            const credentials of [{}, { accessToken: "" }] as Record<
                string,
                string
            >[]
        ) {
            let calls = 0;
            const engine = new Engine({
                transport: directTransport({
                    params: () => Promise.resolve(credentials),
                    fetch: () => {
                        calls++;
                        throw new Error("Must not fetch");
                    },
                }),
            });
            await assertRejects(
                async () => (await engine.load(unit)).run(input),
                Error,
                "credentials invalid",
            );
            assertEquals(calls, 0);
        }
    });

    if (name !== "submit_feedback") {
        Deno.test(`betteroff#${name}: preserves quality states, pagination, and added provider fields`, async () => {
            const unit = await testSealedUnit(`betteroff#${name}`);
            for (const state of ["complete", "partial", "unavailable"]) {
                const fixture = await loadFixture(
                    `${fixtureRoot}synthetic-${fixtureName}.json`,
                );
                const structured = (fixture.calls[0].res.body as {
                    result: { structuredContent: Record<string, Json> };
                }).result.structuredContent;
                structured.quality = {
                    state,
                    reasons: state === "complete"
                        ? []
                        : ["Synthetic coverage limit."],
                    providerCoverage: null,
                };
                structured.page = {
                    returnedCount: 1,
                    totalCount: null,
                    truncated: true,
                    nextCursor: { id: "synthetic-cursor" },
                };
                structured.currency = null;
                structured.asOf = null;
                structured.providerExtension = { available: false };
                if (!Array.isArray(structured.data)) {
                    (structured.data as Record<string, Json>)
                        .providerExtension = {
                            source: "synthetic",
                        };
                }
                const result = await runEndpoint({
                    unit,
                    input,
                    mode: "replay",
                    fixture,
                });
                assertEquals(result.isProviderError, false);
                assertEquals(result.output, structured);
                assertEquals(result.usage, { credits: {}, evidence: {} });
            }
        });
    }
}

for (
    const [scenario, expectedStatus] of [
        ["unauthorized", 401],
        ["forbidden", 403],
        ["rate-limited", 429],
        ["tool-error", 502],
        ["rpc-error", 502],
        ["malformed", 502],
    ] as const
) {
    Deno.test(`betteroff: ${scenario} preserves the error and original HTTP status with zero usage`, async () => {
        const unit = await testSealedUnit("betteroff#get_setup_status");
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-${scenario}.json`,
        );
        const result = await runEndpoint({
            unit,
            input: { body: {} },
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, true);
        assertEquals(result.httpStatus, expectedStatus);
        assertEquals(
            result.providerHttpStatus,
            expectedStatus === 502 ? 200 : undefined,
        );
        assertEquals(result.output, fixture.calls[0].res.body);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
}

Deno.test("betteroff: wrong RPC version or id and structured failure remain provider errors", async () => {
    const unit = await testSealedUnit("betteroff#get_setup_status");
    for (
        const scenario of [
            "version",
            "id",
            "structured-failure",
            "missing-result",
            "sse",
        ]
    ) {
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-setup-status.json`,
        );
        const body = fixture.calls[0].res.body as Record<string, Json>;
        if (scenario === "version") body.jsonrpc = "1.0";
        if (scenario === "id") body.id = 2;
        if (scenario === "structured-failure") {
            body.result = {
                structuredContent: { ok: false, code: "FORBIDDEN" },
            };
        }
        if (scenario === "missing-result") delete body.result;
        if (scenario === "sse") {
            fixture.calls[0].res.body =
                'event: message\ndata: {"jsonrpc":"2.0","id":1}\n\n';
        }
        const result = await runEndpoint({
            unit,
            input: { body: {} },
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, true, scenario);
        assertEquals(result.httpStatus, 502, scenario);
        assertEquals(result.providerHttpStatus, 200, scenario);
        assertEquals(result.output, fixture.calls[0].res.body, scenario);
        assertEquals(result.usage, { credits: {}, evidence: {} }, scenario);
    }
});

Deno.test("betteroff: incomplete successful result envelopes fail the compiled output contract", async () => {
    const unit = await testSealedUnit("betteroff#get_setup_status");
    for (
        const field of [
            "schemaVersion",
            "data",
            "quality",
            "evidence",
            "page",
            "warnings",
        ]
    ) {
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-setup-status.json`,
        );
        const structured = (fixture.calls[0].res.body as {
            result: { structuredContent: Record<string, Json> };
        }).result.structuredContent;
        delete structured[field];
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: {} },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "CONTRACT_VIOLATION",
        );
    }
});
