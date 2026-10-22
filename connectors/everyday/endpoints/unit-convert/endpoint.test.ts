import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { loadFixture, testBundle, testSealedUnit } from "@shared/testing";
import { everydayHarness, oneCallFixture } from "../../test-support.ts";

const fixturesDir = fromFileUrl(
    new URL("../../fixtures/", import.meta.url),
);
const ID = "everyday#unit-convert";
const liveEnabled = Deno.env.get("EVERYDAY_LIVE") === "1" &&
    (await Deno.permissions.query({
            name: "net",
            host: "everyday.alfie.family",
        })).state === "granted";

const input = {
    body: { dimension: "length", value: 5, from: "mi", to: "km" },
} as const;

Deno.test("everyday catalog: three unique FREE endpoints with explicit empty credentials", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("everyday#")
    ).sort();
    assertEquals(ids, [
        "everyday#recipe-scale",
        "everyday#shopping-merge",
        "everyday#unit-convert",
    ]);
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.usage.model, { kind: "FREE" });
        assertEquals(doc.usage.credits, {});
        assertEquals(doc.auth.credentials.properties, {});
        assertEquals(doc.auth.credentials.required, undefined);
        assertEquals(doc.request.url, "https://everyday.alfie.family/mcp");
    }
    assertEquals(
        bundle.providers.everyday.meta.homepageUrl,
        "https://alfie.family",
    );
    assertEquals(
        bundle.providers.everyday.meta.docsUrl,
        "https://alfie.family/agent-guide.html",
    );
});

Deno.test(`${ID} happy: structured MCP result is unwrapped and the complete anonymous wire request is pinned`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-unit-convert-happy.json`,
    );
    const harness = await everydayHarness(unit, fixture);
    const result = await harness.run(input);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        dimension: "length",
        value: 5,
        from: "mi",
        to: "km",
        result: 8.04672,
    });

    assertEquals(harness.credentialLookups, [{
        provider: "everyday",
        // Current engine compatibility fallback asks the resolver for this
        // name even though the compiled schema is explicitly empty. The
        // resolver returns {}, proving no credential value is required.
        fields: ["apiKey"],
    }]);
    assertEquals(harness.calls.length, 1);
    const call = harness.calls[0];
    assertEquals(call.method, "POST");
    assertEquals(call.url, "https://everyday.alfie.family/mcp");
    assertEquals(call.headers.authorization, undefined);
    assertEquals(call.headers["content-type"], "application/json");
    assertEquals(call.headers.accept, "application/json,text/event-stream");
    assertEquals(call.headers["mcp-protocol-version"], "2026-07-28");
    assertEquals(call.headers["mcp-method"], "tools/call");
    assertEquals(call.headers["mcp-name"], "unit_convert");
    assertEquals(call.body, fixture.calls[0].req.body);
});

Deno.test(`${ID} schema: all ten dimensions are published; cross-dimension and caller-controlled MCP fields are rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const bodySchema = unit.doc.input.schema.body as Record<string, Json>;
    assertEquals((bodySchema.oneOf as Json[]).length, 10);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-unit-convert-happy.json`,
    );
    const rejected: Json[] = [
        { dimension: "length", value: 1, from: "kg", to: "m" },
        {
            dimension: "length",
            value: 1,
            from: "m",
            to: "km",
            method: "notifications/initialized",
        },
        { dimension: "currency", value: 1, from: "USD", to: "EUR" },
    ];
    for (const body of rejected) {
        const harness = await everydayHarness(unit, fixture);
        await assertRejects(
            () => harness.run({ body }),
            Error,
            "INVALID_INPUT",
        );
        assertEquals(harness.calls, []);
    }
});

Deno.test(`${ID} errors: HTTP, JSON-RPC, MCP, and malformed successes remain raw zero-usage provider errors`, async () => {
    const cases: Array<{
        name: string;
        status?: number;
        body: Json;
        expectedStatus: number;
        providerHttpStatus?: number;
    }> = [
        {
            name: "http-429",
            status: 429,
            body: { error: "rate_limited", retryAfterSeconds: 1 },
            expectedStatus: 429,
        },
        {
            name: "jsonrpc-error",
            body: {
                jsonrpc: "2.0",
                id: "everyday-unit-convert",
                error: { code: -32602, message: "Invalid params" },
            },
            expectedStatus: 422,
            providerHttpStatus: 200,
        },
        {
            name: "mcp-is-error",
            body: {
                jsonrpc: "2.0",
                id: "everyday-unit-convert",
                result: {
                    isError: true,
                    content: [{ type: "text", text: "conversion failed" }],
                },
            },
            expectedStatus: 422,
            providerHttpStatus: 200,
        },
        {
            name: "missing-result",
            body: { jsonrpc: "2.0", id: "everyday-unit-convert" },
            expectedStatus: 422,
            providerHttpStatus: 200,
        },
        {
            name: "non-object-structured-content",
            body: {
                jsonrpc: "2.0",
                id: "everyday-unit-convert",
                result: { structuredContent: "not-an-object" },
            },
            expectedStatus: 422,
            providerHttpStatus: 200,
        },
        {
            name: "mismatched-id",
            body: {
                jsonrpc: "2.0",
                id: "another-call",
                result: { structuredContent: {} },
            },
            expectedStatus: 422,
            providerHttpStatus: 200,
        },
    ];
    for (const testCase of cases) {
        const unit = await testSealedUnit(ID);
        const fixture = oneCallFixture(
            `everyday-${testCase.name}`,
            `Synthetic ${testCase.name} error envelope.`,
            testCase.body,
            testCase.status,
        );
        const harness = await everydayHarness(unit, fixture);
        const result = await harness.run(input);
        assertEquals(result.httpStatus, testCase.expectedStatus, testCase.name);
        assertEquals(
            result.providerHttpStatus,
            testCase.providerHttpStatus,
            testCase.name,
        );
        assertEquals(result.isProviderError, true, testCase.name);
        assertEquals(
            result.usage,
            { credits: {}, evidence: {} },
            testCase.name,
        );
        assertEquals(result.output, testCase.body, testCase.name);
    }
});

Deno.test(`${ID} output contract rejects a structurally incomplete structuredContent object`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = oneCallFixture(
        "everyday-unit-output-invalid",
        "Synthetic protocol-valid result whose structured payload violates the tool output schema.",
        {
            jsonrpc: "2.0",
            id: "everyday-unit-convert",
            result: {
                structuredContent: {
                    dimension: "length",
                    value: 5,
                    from: "mi",
                    to: "km",
                },
            },
        },
    );
    const harness = await everydayHarness(unit, fixture);
    await assertRejects(
        () => harness.run(input),
        Error,
        "CONTRACT_VIOLATION",
    );
    assertEquals(harness.calls.length, 1);
});

Deno.test({
    name: `${ID} live maintenance (explicit EVERYDAY_LIVE=1 opt-in)`,
    ignore: !liveEnabled,
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const harness = await everydayHarness(unit);
        const result = await harness.run(input);
        assertEquals(result.httpStatus, 200, JSON.stringify(result.output));
        assertEquals(result.output, {
            dimension: "length",
            value: 5,
            from: "mi",
            to: "km",
            result: 8.04672,
        });
        assertEquals(harness.calls[0].headers.authorization, undefined);
    },
});
