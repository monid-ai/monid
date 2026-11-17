import { assert, assertEquals } from "@std/assert";
import type { Json } from "@shared/core";
import { estimateEndpoint, runEndpoint, testSealedUnit } from "@shared/testing";
import {
    captureEngine,
    fixture,
    FREE,
    jsonResponse,
    MCP_URL,
    META,
    oneCall,
    type Seen,
    structuredOf,
    WIRE_HEADERS,
} from "../../test-support.ts";

const ID = "sellmycompanydata#assessment-checklist";
const RPC_ID = "sellmycompanydata-assessment-checklist";

Deno.test(`${ID} happy: the recorded checklist replays as structuredContent, free`, async () => {
    const fx = await fixture("checklist-ok");
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay",
        fixture: fx,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.providerHttpStatus, undefined);
    assertEquals(result.usage, FREE);
    assertEquals(result.output, structuredOf(fx));
    const out = result.output as {
        privacy_rule: string;
        categories: { category: string }[];
    };
    assert(out.privacy_rule.startsWith("Counts and date ranges only."));
    assertEquals(out.categories.map((c) => c.category), [
        "chat",
        "crm",
        "support",
        "docs",
        "code",
        "email",
        "project",
        "finance",
    ]);
});

Deno.test(`${ID} provider error: a JSON-RPC error inside an HTTP 200 is data, zero usage`, async () => {
    // what the server answers if the tool is ever renamed or withdrawn
    const body = {
        jsonrpc: "2.0",
        id: RPC_ID,
        error: { code: -32602, message: "Unknown tool: assessment_checklist" },
    };
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay",
        fixture: oneCall("rpc-error", 200, body),
    });
    // OURS 422 (the call failed) / THEIRS 200 (the exchange succeeded)
    assertEquals(result.httpStatus, 422);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, FREE);
    assertEquals(result.output, {
        message: "Unknown tool: assessment_checklist",
        code: -32602,
        raw: body,
    });
});

/**
 * No schema gate here, and that is the behaviour worth pinning rather than
 * an omission: the tool takes no arguments, so the doc declares no input
 * schema and there is nothing for a gate to reject. The egress test below
 * shows the binding sends `arguments: {}` whatever a caller passes.
 */
Deno.test(`${ID} takes no input, so it declares no input schema`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.input.schema.body, undefined);
    assertEquals(unit.doc.input.schema.queryParams, undefined);
    assertEquals(unit.doc.input.schema.pathParams, undefined);
});

Deno.test(`${ID} egress: one POST, the pinned tools/call, nothing a caller sends`, async () => {
    const unit = await testSealedUnit(ID);
    const fx = await fixture("checklist-ok");
    const seen: Seen[] = [];
    const loaded = await captureEngine(
        seen,
        () => jsonResponse(fx.calls[0].res.status, fx.calls[0].res.body),
    ).load(unit);
    const result = await loaded.run({
        body: {
            name: "request_offer",
            arguments: { email: "owner@example.com" },
        },
        queryParams: { q: "1" },
    });
    assertEquals(result.isProviderError, false);
    const sent: Json = {
        jsonrpc: "2.0",
        id: RPC_ID,
        method: "tools/call",
        params: { name: "assessment_checklist", arguments: {}, _meta: META },
    };
    assertEquals(seen.length, 1);
    assertEquals(seen[0].url, MCP_URL);
    assertEquals(seen[0].method, "POST");
    assertEquals(seen[0].headers, WIRE_HEADERS);
    assertEquals(seen[0].body, sent);
    // the fixture was recorded with exactly this body
    assertEquals(fx.calls[0].req.body, sent);
});

Deno.test(`${ID}: the pre-run estimate is zero`, async () => {
    assertEquals(await estimateEndpoint(await testSealedUnit(ID), {}), FREE);
});

Deno.test({
    // keyless: there is no credential for liveSkip to gate on, so the live
    // run is an explicit opt-in and CI stays offline
    name: `${ID} live (gated on SELLMYCOMPANYDATA_LIVE=1; keyless, free)`,
    ignore: Deno.env.get("SELLMYCOMPANYDATA_LIVE") !== "1",
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {},
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, FREE);
        const out = result.output as Record<string, Json>;
        assertEquals(typeof out.privacy_rule, "string");
        assert(Array.isArray(out.categories));
    },
});
