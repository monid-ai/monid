import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import {
    assertPinnedMcpCall,
    assertRejectedBeforeCall,
    mcpSuccess,
    mermailHarness,
    oneCallFixture,
} from "../../test-support.ts";

const ID = "mermail#list-mailboxes";
const RPC_ID = "mermail-list-mailboxes";
const INPUT = { body: {} } as const;
const OUTPUT = {
    items: [{
        public_id: "mb_public_1",
        email: "agent@mermail.app",
        name: "Agent",
        can_receive: true,
        receiving_status: "ready",
    }],
};

const CREDITS: Record<string, number> = {
    "mermail#list-mailboxes": 1,
    "mermail#get-mailbox": 1,
    "mermail#create-mailbox": 10,
    "mermail#list-emails": 1,
    "mermail#search-emails": 1,
    "mermail#get-email": 1,
    "mermail#get-email-context": 1,
    "mermail#send-email": 5,
    "mermail#reply-to-email": 5,
    "mermail#forward-email": 5,
};

Deno.test("mermail catalog: ten MCP endpoints, API-key auth, pinned credits", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("mermail#")
    ).sort();
    assertEquals(ids, Object.keys(CREDITS).sort());
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.request.url, "https://console.mermail.app/mcp");
        assertEquals(doc.request.method, "POST");
        assertEquals(doc.usage.model.kind, "PER_CALL");
        assertEquals(doc.usage.credits, {
            default: { label: "Mermail API credits" },
        });
        const model = doc.usage.model;
        if (model.kind !== "PER_CALL") continue;
        assertEquals(model.consumes, {
            credit: "default",
            amount: CREDITS[id],
        });
    }
    assertEquals(
        bundle.providers.mermail.meta.homepageUrl,
        "https://mermail.app",
    );
    assertEquals(
        bundle.providers.mermail.meta.docsUrl,
        "https://docs.mermail.app/ai/mcp",
    );
    assertEquals(bundle.providers.mermail.meta.categories, ["email"]);
    const unit = await testSealedUnit(ID);
    assertEquals(await estimateEndpoint(unit, INPUT), {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
});

Deno.test(`${ID} happy: structured MCP result is unwrapped and the API-key wire request is pinned`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = oneCallFixture(
        "mermail-list-mailboxes-happy",
        "Synthetic MCP tools/call success for list_mailboxes.",
        mcpSuccess(RPC_ID, OUTPUT),
    );
    const harness = await mermailHarness(unit, fixture);
    const result = await harness.run(INPUT);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, OUTPUT);
    assertEquals(harness.calls.length, 1);
    assertPinnedMcpCall(harness.calls[0], "list_mailboxes", RPC_ID, {});
});

Deno.test(`${ID} schema: callers cannot select another MCP tool or field`, async () => {
    const rejected: Json[] = [
        { method: "tools/list" },
        { name: "delete_email" },
        { query: { workspace: "nope" } },
        { query: { workspaceId: "ws_1", tool: "send_email" } },
    ];
    for (const body of rejected) {
        await assertRejectedBeforeCall(ID, body);
    }
});

Deno.test(`${ID} errors: HTTP, JSON-RPC, MCP, and malformed successes are zero-usage provider errors`, async () => {
    const cases: Array<{
        name: string;
        status?: number;
        body: Json;
        expectedStatus: number;
        providerHttpStatus?: number;
    }> = [
        {
            name: "http-401",
            status: 401,
            body: { error: "Unauthorized" },
            expectedStatus: 401,
        },
        {
            name: "http-402",
            status: 402,
            body: { error: "credits_exhausted", code: "credits_exhausted" },
            expectedStatus: 402,
        },
        {
            name: "jsonrpc-error",
            body: {
                jsonrpc: "2.0",
                id: RPC_ID,
                error: { code: -32602, message: "Invalid params" },
            },
            expectedStatus: 422,
            providerHttpStatus: 200,
        },
        {
            name: "mcp-is-error",
            body: {
                jsonrpc: "2.0",
                id: RPC_ID,
                result: {
                    isError: true,
                    content: [{ type: "text", text: "mailbox not found" }],
                    structuredContent: { error: "Not found" },
                },
            },
            expectedStatus: 422,
            providerHttpStatus: 200,
        },
        {
            name: "missing-result",
            body: { jsonrpc: "2.0", id: RPC_ID },
            expectedStatus: 422,
            providerHttpStatus: 200,
        },
        {
            name: "non-object-structured-content",
            body: {
                jsonrpc: "2.0",
                id: RPC_ID,
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
            `mermail-${testCase.name}`,
            `Synthetic ${testCase.name} error envelope.`,
            testCase.body,
            testCase.status,
        );
        const harness = await mermailHarness(unit, fixture);
        const result = await harness.run(INPUT);
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

Deno.test(`${ID} schema accepts the documented optional workspace filter`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        await estimateEndpoint(unit, {
            body: { query: { workspaceId: "ws_1" } },
        }),
        { credits: { default: 1 }, evidence: { CALL: 1 } },
    );
    await assertRejects(
        () => estimateEndpoint(unit, { body: { query: { nope: true } } }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: `${ID} live (gated on MERMAIL_CREDENTIALS_API_KEY)`,
    ignore: liveSkip("mermail"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const apiKey = Deno.env.get("MERMAIL_CREDENTIALS_API_KEY") ??
            Deno.env.get("MERMAIL_API_KEY") ?? "";
        const harness = await mermailHarness(unit, undefined, apiKey);
        const result = await harness.run(INPUT);
        assertEquals(result.httpStatus, 200, JSON.stringify(result.output));
        assertEquals(result.isProviderError, false);
        assertEquals(harness.calls.length, 1);
        assertEquals(harness.calls[0].url, "https://console.mermail.app/mcp");
        assertEquals(harness.calls[0].headers.authorization, undefined);
        const output = result.output as { items?: unknown };
        assertEquals(Array.isArray(output.items), true);
    },
});
