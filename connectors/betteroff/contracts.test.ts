import type { Json } from "@shared/core";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";
import { cases } from "./test-cases.ts";

const fixtureRoot = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("betteroff: exposes 21 reads and eight writes, all requiring Core and named scopes", async () => {
    assertEquals(cases.length, 29);
    assertEquals(cases.filter((c) => c.readOnly).length, 21);
    assertEquals(cases.filter((c) => !c.readOnly).map((c) => c.name).sort(), [
        "cancel_action_request",
        "propose_category_change",
        "propose_debt_details",
        "propose_recurring_kind",
        "request_bank_transfer",
        "request_transfer",
        "request_vault_deposit",
        "submit_feedback",
    ]);
    const bundle = await testBundle();
    for (const c of cases) {
        const doc = bundle.endpoints[`betteroff#${c.name}`];
        assert(doc.meta.description?.includes("BetterOff Core"), c.name);
        for (const scope of c.scopes) {
            assert(
                doc.meta.description?.includes(scope),
                `${c.name}: ${scope}`,
            );
        }
    }
    assertEquals(
        Object.keys(bundle.endpoints).filter((id) =>
            id.startsWith("betteroff#") && /approve|execute|sign|apply/.test(id)
        ),
        [],
    );
});

for (const c of cases) {
    Deno.test(`betteroff#${c.name}: rejects missing required result fields`, async () => {
        const unit = await testSealedUnit(`betteroff#${c.name}`);
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-${c.fixture}.json`,
        );
        const structured = (fixture.calls[0].res.body as {
            result: { structuredContent: Record<string, Json> };
        }).result.structuredContent;
        const fields = c.name === "submit_feedback"
            ? ["receiptId", "status", "duplicate"]
            : ["data", "quality", "warnings", "householdRevision"];
        for (const field of fields) {
            const invalid = structuredClone(fixture);
            delete (invalid.calls[0].res.body as {
                result: { structuredContent: Record<string, Json> };
            }).result.structuredContent[field];
            await assertRejects(
                () =>
                    runEndpoint({
                        unit,
                        input: c.input,
                        mode: "replay",
                        fixture: invalid,
                    }),
                Error,
                "CONTRACT_VIOLATION",
            );
        }
        if (c.name !== "submit_feedback") {
            const invalid = structuredClone(fixture);
            (invalid.calls[0].res.body as {
                result: { structuredContent: Record<string, Json> };
            }).result.structuredContent.revision = "wrong-type";
            await assertRejects(
                () =>
                    runEndpoint({
                        unit,
                        input: c.input,
                        mode: "replay",
                        fixture: invalid,
                    }),
                Error,
                "CONTRACT_VIOLATION",
            );
        }
        // Every required data field is validated, including array item contracts.
        if (structured.data !== undefined) {
            const data = structured.data;
            const obj = (Array.isArray(data) ? data[0] : data) as Record<
                string,
                Json
            >;
            for (const key of Object.keys(obj)) {
                const invalid = structuredClone(fixture);
                const changed = (invalid.calls[0].res.body as {
                    result: { structuredContent: Record<string, Json> };
                }).result.structuredContent;
                const target = (Array.isArray(changed.data)
                    ? changed.data[0]
                    : changed.data) as Record<string, Json>;
                delete target[key];
                await assertRejects(
                    () =>
                        runEndpoint({
                            unit,
                            input: c.input,
                            mode: "replay",
                            fixture: invalid,
                        }),
                    Error,
                    "CONTRACT_VIOLATION",
                );
            }
        }
    });
}

for (
    const name of [
        "request_transfer",
        "request_bank_transfer",
        "request_vault_deposit",
        "submit_feedback",
    ]
) {
    Deno.test(`betteroff#${name}: requires an idempotency key for writes and forwards the same key unchanged`, async () => {
        const c = cases.find((c) => c.name === name)!;
        const unit = await testSealedUnit(`betteroff#${name}`);
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-${c.fixture}.json`,
        );
        const sent: Json[] = [];
        const run = await new Engine({
            transport: directTransport({
                params: async () => ({ accessToken: "synthetic-token" }),
                fetch: async (_url, init) => {
                    sent.push(JSON.parse(String(init?.body)).params.arguments);
                    return new Response(
                        JSON.stringify(fixture.calls[0].res.body),
                        { status: 200 },
                    );
                },
            }),
        }).load(unit);
        const bad = { ...c.input.body as Record<string, Json> };
        delete bad.idempotencyKey;
        await assertRejects(
            () => run.run({ body: bad }),
            Error,
            "INVALID_INPUT",
        );
        assertEquals(sent.length, 0);
        await run.run(c.input);
        await run.run(c.input);
        assertEquals(sent, [c.input.body, c.input.body]);
        // Forwarding preserves a retry key; deduplication is a provider guarantee,
        // not established by this synthetic transport.
    });
}

Deno.test("betteroff#request_bank_transfer: allows account discovery but rejects partial creation", async () => {
    const unit = await testSealedUnit("betteroff#request_bank_transfer");
    const c = cases.find((c) => c.name === "request_bank_transfer")!;
    let calls = 0;
    const run = await new Engine({
        transport: directTransport({
            params: async () => ({ accessToken: "synthetic-token" }),
            fetch: async (_url, init) => {
                calls++;
                assertEquals(
                    JSON.parse(String(init?.body)).params.arguments,
                    {},
                );
                return new Response(
                    JSON.stringify({ code: "SYNTHETIC_DISCOVERY_DENIAL" }),
                    { status: 403 },
                );
            },
        }),
    }).load(unit);
    assertEquals((await run.run({ body: {} })).httpStatus, 403);
    for (const key of Object.keys(c.input.body as Record<string, Json>)) {
        const body = { ...c.input.body as Record<string, Json> };
        delete body[key];
        await assertRejects(() => run.run({ body }), Error, "INVALID_INPUT");
    }
    assertEquals(calls, 1);
});

Deno.test("betteroff#submit_feedback: missing or false approval prevents credential lookup and egress", async () => {
    const c = cases.find((c) => c.name === "submit_feedback")!;
    const unit = await testSealedUnit("betteroff#submit_feedback");
    let lookups = 0;
    const run = await new Engine({
        transport: directTransport({
            params: async () => {
                lookups++;
                throw new Error("Must not resolve credentials");
            },
            fetch: async () => {
                throw new Error("Must not send feedback");
            },
        }),
    }).load(unit);
    const missing = { ...c.input.body as Record<string, Json> };
    delete missing.userApproved;
    for (const body of [missing, { ...missing, userApproved: false }]) {
        await assertRejects(() => run.run({ body }), Error, "INVALID_INPUT");
    }
    assertEquals(lookups, 0);
});

for (const c of cases.filter((c) => !c.readOnly)) {
    Deno.test(`betteroff#${c.name}: writes once, preserves review state or receipt, and never follows a review link`, async () => {
        const unit = await testSealedUnit(`betteroff#${c.name}`);
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-${c.fixture}.json`,
        );
        let calls = 0;
        const run = await new Engine({
            transport: directTransport({
                params: async () => ({ accessToken: "synthetic-token" }),
                fetch: async (url, init) => {
                    calls++;
                    assertEquals(
                        String(url),
                        "https://api.betteroff.finance/mcp",
                    );
                    assertEquals(
                        JSON.parse(String(init?.body)).params.name,
                        `betteroff_${c.name}`,
                    );
                    return new Response(
                        JSON.stringify(fixture.calls[0].res.body),
                        { status: 200 },
                    );
                },
            }),
        }).load(unit);
        const result = await run.run(c.input);
        const expected = (fixture.calls[0].res.body as {
            result: { structuredContent: Json };
        }).result.structuredContent;
        assertEquals(result.output, expected);
        assertEquals(calls, 1);
        assertEquals(result.isProviderError, false);
    });
}

Deno.test("betteroff#cancel_action_request: foreign ownership and signing-state denial cannot become successful cancellation", async () => {
    const c = cases.find((c) => c.name === "cancel_action_request")!;
    const unit = await testSealedUnit("betteroff#cancel_action_request");
    for (const code of ["FORBIDDEN", "ACTION_REQUEST_NOT_CANCELLABLE"]) {
        let calls = 0;
        const body = {
            jsonrpc: "2.0",
            id: 1,
            result: {
                isError: true,
                structuredContent: {
                    ok: false,
                    code,
                    error: "Synthetic denial",
                    retryable: false,
                    nextStep: "Review in BetterOff.",
                },
            },
        };
        const result = await (await new Engine({
            transport: directTransport({
                params: async () => ({ accessToken: "synthetic-token" }),
                fetch: async () => {
                    calls++;
                    return new Response(JSON.stringify(body), { status: 200 });
                },
            }),
        }).load(unit)).run(c.input);
        assertEquals(result.isProviderError, true);
        assertEquals(result.httpStatus, 502);
        assertEquals(result.output, body);
        assertEquals(calls, 1);
    }
});

const invalidInputs: [string, Record<string, Json>][] = [
    ["search_markets", { limit: 51 }],
    ["list_accounts", { accountType: "foreign" }],
    ["get_net_worth_history", { cursor: { offset: -1, revision: 1 } }],
    ["explain_net_worth_change", { startDate: "2026-02-30" }],
    ["search_transactions", { limit: 1.5 }],
    ["analyze_spending", { startDate: "not-a-date" }],
    ["simulate_debt_payoff", { extraMonthly: -1 }],
    ["search_activity", { accountId: "not-a-uuid" }],
    ["list_observations", { limit: 31 }],
    ["propose_category_change", { transactionIds: [] }],
    ["propose_category_change", {
        transactionIds: Array(11).fill("11111111-1111-4111-8111-111111111111"),
    }],
    ["propose_recurring_kind", { streamId: "" }],
    ["propose_debt_details", { interestRate: 101 }],
    ["request_transfer", { amountUsdc: "0.0000001" }],
    ["request_transfer", { amountUsdc: 10.25 }],
    ["request_bank_transfer", { amountUsd: "10.001" }],
    ["request_vault_deposit", { vault: "not-an-address" }],
    ["get_action_request", { requestId: "not-a-uuid" }],
    ["cancel_action_request", { requestId: "not-a-uuid" }],
    ["submit_feedback", { description: "x".repeat(1001) }],
];
for (const [name, patch] of invalidInputs) {
    Deno.test(`betteroff#${name}: rejects invalid ${Object.keys(patch).join(", ")} before credential lookup`, async () => {
        const c = cases.find((c) => c.name === name)!;
        const unit = await testSealedUnit(`betteroff#${name}`);
        let lookups = 0;
        const run = await new Engine({
            transport: directTransport({
                params: async () => {
                    lookups++;
                    throw new Error("Must not look up credentials");
                },
                fetch: async () => {
                    throw new Error("Must not fetch");
                },
            }),
        }).load(unit);
        await assertRejects(
            () =>
                run.run({
                    body: { ...c.input.body as Record<string, Json>, ...patch },
                }),
            Error,
            "INVALID_INPUT",
        );
        assertEquals(lookups, 0);
    });
}

Deno.test("betteroff#request_bank_transfer: account discovery validates its distinct success shape", async () => {
    const unit = await testSealedUnit("betteroff#request_bank_transfer");
    const fixture = await loadFixture(
        `${fixtureRoot}synthetic-request-bank-transfer.json`,
    );
    const content = (fixture.calls[0].res.body as {
        result: { structuredContent: Record<string, Json> };
    }).result.structuredContent;
    content.data = {
        accounts: [{ id: "synthetic-account", label: "Synthetic checking" }],
        capUsd: "1000.00",
        note: "Synthetic eligible accounts; no request was created.",
    };
    const result = await runEndpoint({
        unit,
        input: { body: {} },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, content);
    delete (content.data as Record<string, Json>).capUsd;
    await assertRejects(
        () =>
            runEndpoint({ unit, input: { body: {} }, mode: "replay", fixture }),
        Error,
        "CONTRACT_VIOLATION",
    );
});
