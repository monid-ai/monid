import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json, RunInput } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    type Fixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
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

const ID = "sellmycompanydata#estimate-data-value";
const RPC_ID = "sellmycompanydata-estimate-data-value";
const UNEXPECTED = "Sell My Company Data returned an unexpected response";

/** The figures behind the recorded estimates: made up, no real company. */
const UK_60: Record<string, Json> = {
    employees: 60,
    founded_year: 2015,
    country: "uk",
    systems: [
        {
            tool: "Slack",
            category: "chat",
            since_year: 2016,
            volume: "400k messages",
            measured: false,
        },
        { tool: "HubSpot", category: "crm", since_year: 2017 },
        { tool: "Zendesk", category: "support", since_year: 2018 },
    ],
    slack_public_share: "half",
};
const US_8: Record<string, Json> = {
    employees: 8,
    founded_year: 2023,
    country: "us",
    systems: [{ tool: "Slack", category: "chat", since_year: 2023 }],
};

/** Each recorded chain and the input behind it. */
const OK = { name: "estimate-ok", input: { body: UK_60 } };
const BELOW_BAR = { name: "estimate-below-bar", input: { body: US_8 } };
const REFUSED = {
    name: "estimate-refused",
    input: { body: { ...UK_60, founded_year: 2030 } },
};

async function replay(fx: Fixture, input: RunInput) {
    const unit = await testSealedUnit(ID);
    return await runEndpoint({ unit, input, mode: "replay", fixture: fx });
}

function rpcSuccess(id: string, structuredContent: Json): Json {
    return {
        jsonrpc: "2.0",
        id,
        result: {
            content: [{ type: "text", text: "ok" }],
            structuredContent,
        },
    };
}

function isPointedAtEstimateUrl(nextStep: Json | undefined): boolean {
    return typeof nextStep === "string" && nextStep.includes("estimate_url") &&
        !nextStep.includes("call request_offer");
}

Deno.test(`${ID}: each recorded request body is the one the connector sends`, async () => {
    for (const { name, input } of [OK, BELOW_BAR, REFUSED]) {
        const fx = await fixture(name);
        const seen: Seen[] = [];
        const loaded = await captureEngine(
            seen,
            () => jsonResponse(fx.calls[0].res.status, fx.calls[0].res.body),
        ).load(await testSealedUnit(ID));
        await loaded.run(input);
        assertEquals(seen.length, 1, name);
        assertEquals(seen[0].body, fx.calls[0].req.body, name);
    }
});

Deno.test(`${ID} happy: recorded estimates replay field for field; only next_step is ours`, async () => {
    for (const { name, input } of [OK, BELOW_BAR]) {
        const fx = await fixture(name);
        const result = await replay(fx, input);
        assertEquals(result.httpStatus, 200, name);
        assertEquals(result.isProviderError, false, name);
        assertEquals(result.usage, FREE, name);
        const { next_step: ours, ...rest } = result.output as Record<
            string,
            Json
        >;
        const { next_step: theirs, ...recorded } = structuredOf(fx);
        assertEquals(rest, recorded, name);
        // the server's own step names request_offer, which is not here
        assert(String(theirs).includes("call request_offer"), name);
        assert(isPointedAtEstimateUrl(ours), name);
    }

    const ok = (await replay(await fixture(OK.name), OK.input))
        .output as Record<string, Json>;
    assertEquals(ok.qualifies, true);
    assertEquals(
        ok.headline,
        "Estimated range: $238K – $460K (United Kingdom).",
    );
    assertEquals([ok.low_usd, ok.high_usd], [237882, 460446]);
    assert(
        String(ok.estimate_url).startsWith(
            "https://sellmycompanydata.com/?e=60&f=2015&c=uk",
        ),
    );

    const small = (await replay(await fixture(BELOW_BAR.name), BELOW_BAR.input))
        .output as Record<string, Json>;
    assertEquals(small.qualifies, false);
    assertEquals(small.below_bar, true);
    assertEquals([small.low_usd, small.high_usd], [40000, 113500]);
});

Deno.test(`${ID} provider error: the server's own refusal (HTTP 200, isError) bills nothing`, async () => {
    const fx = await fixture(REFUSED.name);
    const result = await replay(fx, REFUSED.input);
    // OURS 422 (the tool refused) / THEIRS 200 (the exchange succeeded)
    assertEquals(result.httpStatus, 422);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, FREE);
    assertEquals(result.output, {
        message: "founded_year must be between 1800 and 2026. Ask the user " +
            "for the missing or corrected value and call again.",
        raw: fx.calls[0].res.body,
    });
});

Deno.test(`${ID} provider error: JSON-RPC errors, HTTP errors and malformed envelopes bill nothing`, async () => {
    const cases: {
        name: string;
        status: number;
        body: Json;
        httpStatus: number;
        providerHttpStatus?: number;
        message: string;
        code?: number;
    }[] = [
        {
            name: "rpc-error",
            status: 200,
            body: {
                jsonrpc: "2.0",
                id: RPC_ID,
                error: { code: -32602, message: "Unknown tool: x" },
            },
            httpStatus: 422,
            providerHttpStatus: 200,
            message: "Unknown tool: x",
            code: -32602,
        },
        {
            name: "mismatched-id",
            status: 200,
            body: rpcSuccess("another-request", { estimate: true }),
            httpStatus: 422,
            providerHttpStatus: 200,
            message: UNEXPECTED,
        },
        {
            name: "wrong-jsonrpc-version",
            status: 200,
            body: {
                jsonrpc: "1.0",
                id: RPC_ID,
                result: { structuredContent: { estimate: true } },
            },
            httpStatus: 422,
            providerHttpStatus: 200,
            message: UNEXPECTED,
        },
        {
            name: "no-structured-content",
            status: 200,
            body: {
                jsonrpc: "2.0",
                id: RPC_ID,
                result: { content: [{ type: "text", text: "ok" }] },
            },
            httpStatus: 422,
            providerHttpStatus: 200,
            message: UNEXPECTED,
        },
        {
            name: "array-structured-content",
            status: 200,
            body: rpcSuccess(RPC_ID, [1, 2]),
            httpStatus: 422,
            providerHttpStatus: 200,
            message: UNEXPECTED,
        },
        {
            name: "non-boolean-is-error",
            status: 200,
            body: {
                jsonrpc: "2.0",
                id: RPC_ID,
                result: { isError: "yes", structuredContent: {} },
            },
            httpStatus: 422,
            providerHttpStatus: 200,
            message: UNEXPECTED,
        },
        {
            name: "parse-error",
            status: 400,
            body: {
                jsonrpc: "2.0",
                id: null,
                error: { code: -32700, message: "Parse error." },
            },
            httpStatus: 400,
            message: "Parse error.",
            code: -32700,
        },
        {
            name: "not-found",
            status: 404,
            body: { error: "not_found" },
            httpStatus: 404,
            message: "not_found",
        },
    ];
    for (const c of cases) {
        const result = await replay(
            oneCall(c.name, c.status, c.body),
            OK.input,
        );
        assertEquals(result.httpStatus, c.httpStatus, c.name);
        assertEquals(result.providerHttpStatus, c.providerHttpStatus, c.name);
        assertEquals(result.isProviderError, true, c.name);
        assertEquals(result.usage, FREE, c.name);
        assertEquals(result.output, {
            message: c.message,
            ...(c.code !== undefined ? { code: c.code } : {}),
            raw: c.body,
        }, c.name);
    }
});

Deno.test(`${ID} schema gate: rejects what the server's schema rejects, before any call`, async () => {
    const sys: Record<string, Json> = { tool: "Slack", category: "chat" };
    const base: Record<string, Json> = {
        employees: 60,
        founded_year: 2015,
        country: "uk",
        systems: [sys],
    };
    const rejected: [string, Json][] = [
        ["empty body", {}],
        ["no systems", { employees: 60, founded_year: 2015, country: "uk" }],
        ["employees 0", { ...base, employees: 0 }],
        ["employees over the cap", { ...base, employees: 1_000_001 }],
        ["employees not whole", { ...base, employees: 2.5 }],
        ["founded before 1800", { ...base, founded_year: 1799 }],
        ["unknown country", { ...base, country: "fr" }],
        ["systems as text", { ...base, systems: "Slack, HubSpot" }],
        [
            "31 systems",
            { ...base, systems: Array.from({ length: 31 }, () => sys) },
        ],
        ["system without category", { ...base, systems: [{ tool: "Slack" }] }],
        [
            "unknown category",
            { ...base, systems: [{ tool: "Slack", category: "wiki" }] },
        ],
        [
            "empty tool name",
            { ...base, systems: [{ tool: "", category: "chat" }] },
        ],
        [
            "tool name over 80",
            { ...base, systems: [{ tool: "x".repeat(81), category: "chat" }] },
        ],
        [
            "since_year before 1980",
            { ...base, systems: [{ ...sys, since_year: 1979 }] },
        ],
        [
            "volume over 120",
            { ...base, systems: [{ ...sys, volume: "9".repeat(121) }] },
        ],
        ["negative people", { ...base, systems: [{ ...sys, people: -1 }] }],
        [
            "unknown exportable",
            { ...base, systems: [{ ...sys, exportable: "maybe" }] },
        ],
        ["measured as text", {
            ...base,
            systems: [{ ...sys, measured: "yes" }],
        }],
        [
            "message content in a system",
            { ...base, systems: [{ ...sys, content: "message text" }] },
        ],
        ["unknown Slack share", { ...base, slack_public_share: "all" }],
        ["contact details", { ...base, email: "owner@example.com" }],
        ["a tool name", { ...base, name: "request_offer" }],
    ];
    const unit = await testSealedUnit(ID);
    // no fixture: any upstream call would itself fail the test
    await assertRejects(
        () => runEndpoint({ unit, input: {}, mode: "replay" }),
        Error,
        "INVALID_INPUT",
        "no body at all",
    );
    for (const [why, body] of rejected) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    }
    // near-twins of those bounds clear the gate (replay matches method +
    // url, not body)
    const ok = await fixture(OK.name);
    const passing: Json[] = [
        { ...base, systems: [] },
        {
            ...base,
            employees: 1,
            founded_year: 1800,
            systems: Array.from({ length: 30 }, () => sys),
        },
        { ...base, employees: 1_000_000 },
        {
            ...base,
            slack_public_share: "no_slack",
            systems: [{
                tool: "x".repeat(80),
                category: "other",
                since_year: 1980,
                volume: "9".repeat(120),
                people: 0,
                exportable: "unsure",
                measured: true,
            }],
        },
    ];
    for (const body of passing) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture: ok,
        });
    }
});

Deno.test(`${ID} egress: one POST to /mcp, the pinned tools/call envelope, no credential`, async () => {
    const seen: Seen[] = [];
    const loaded = await captureEngine(
        seen,
        () =>
            jsonResponse(
                200,
                rpcSuccess(RPC_ID, {
                    estimate: true,
                    next_step: "Then call request_offer.",
                }),
            ),
    ).load(await testSealedUnit(ID));
    // query params have no schema here and never reach the wire
    const result = await loaded.run({
        body: UK_60,
        queryParams: { utm_source: "x" },
    });
    assertEquals(result.isProviderError, false);
    const out = result.output as Record<string, Json>;
    assertEquals(out.estimate, true);
    assert(isPointedAtEstimateUrl(out.next_step));
    assertEquals(seen.length, 1);
    assertEquals(seen[0].url, MCP_URL);
    assertEquals(seen[0].method, "POST");
    assertEquals(seen[0].headers, WIRE_HEADERS);
    assertEquals(seen[0].body, {
        jsonrpc: "2.0",
        id: RPC_ID,
        method: "tools/call",
        params: { name: "estimate_data_value", arguments: UK_60, _meta: META },
    });
});

Deno.test(`${ID}: a non-JSON 5xx from the edge is data, zero usage`, async () => {
    // replay always serves JSON, so this drives a real text/plain body
    const seen: Seen[] = [];
    const loaded = await captureEngine(
        seen,
        () =>
            new Response("error code: 1101", {
                status: 500,
                headers: { "content-type": "text/plain" },
            }),
    ).load(await testSealedUnit(ID));
    const result = await loaded.run(OK.input);
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, undefined);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, FREE);
    assertEquals(result.output, {
        message: UNEXPECTED,
        raw: "error code: 1101",
    });
    assertEquals(seen.length, 1);
});

Deno.test(`${ID}: the pre-run estimate is zero`, async () => {
    assertEquals(
        await estimateEndpoint(await testSealedUnit(ID), OK.input),
        FREE,
    );
});

Deno.test({
    // keyless: there is no credential for liveSkip to gate on, so the live
    // run is an explicit opt-in and CI stays offline
    name: `${ID} live (gated on SELLMYCOMPANYDATA_LIVE=1; keyless, free)`,
    ignore: Deno.env.get("SELLMYCOMPANYDATA_LIVE") !== "1",
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: OK.input,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, FREE);
        const out = result.output as Record<string, Json>;
        assertEquals(out.estimate, true);
        assertEquals(typeof out.low_usd, "number");
        assert(
            String(out.estimate_url).startsWith(
                "https://sellmycompanydata.com/?",
            ),
        );
        assert(isPointedAtEstimateUrl(out.next_step));
    },
});
