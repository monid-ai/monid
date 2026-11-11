import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json, RunKind, StopKind } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    assertInputAccepted,
    estimateEndpoint,
    type Fixture,
    liveSkip,
    loadEndpoint,
    loadFixture,
    replayFetch,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "specstream#v1/capacity/executions";
const QUOTE_HASH =
    "0f9e8d7c6b5a49382716f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0";

const INPUT = {
    body: {
        quote_id: "qt_synthetic_0001",
        quote_hash: QUOTE_HASH,
        idempotency_key: "specstream-run-0001",
        confirm_max_cents: 60,
    },
};

const fixture = (name: string) => loadFixture(`${chains}${name}.json`);

Deno.test("specstream#v1/capacity/executions: runs the approved quote to a settled page and bills what was captured", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-run-ok"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // 20 cents for the result with an email, 15 for the one without; the
    // other 25 of the 60 reserved went back. The vendor's receipt is the
    // claim, so the run settles at $0.35 and not at the $0.60 ceiling.
    assertEquals(result.usage, {
        credits: { default: 0.35 },
        evidence: { CREDIT: 35 },
    });
    assertEquals(result.usage.mismatch, undefined);

    type Cell = { provenance?: { source_url?: string } | null };
    const data = (result.output as {
        data: {
            done: boolean;
            rows: { cells: Cell[] }[];
            commerce: { settlement_status: string };
        };
    }).data;
    assertEquals(data.done, true);
    assertEquals(data.commerce.settlement_status, "settled");
    // each value still names the page it came from
    assertEquals(data.rows.length, 2);
    assertEquals(
        data.rows[0].cells[2].provenance?.source_url,
        "https://clinic-1.example.org/contact",
    );
});

Deno.test("specstream#v1/capacity/executions: the poll waits out a running find and a charge that is not yet settled", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-run-ok"),
    });
    const started = await loaded.start(INPUT);
    assert(started.kind === RunKind.RUNNING);
    assertEquals(started.state.externalRunId, "specstream-run-0001");

    // the find is still running: the page says to come back in 5 seconds
    const running = await loaded.poll(INPUT, started.state);
    assert(running.kind === RunKind.RUNNING);
    assertEquals(running.pollAfterMs, 5_000);

    // done, rows in hand, but the charge is pending (retry_after_seconds is
    // null here): not over until the receipt settles
    const pending = await loaded.poll(INPUT, running.state);
    assert(pending.kind === RunKind.RUNNING);

    const settled = await loaded.poll(INPUT, pending.state);
    assert(settled.kind === RunKind.COMPLETED);
    assertEquals(settled.usage.credits, { default: 0.35 });
});

Deno.test("specstream#v1/capacity/executions: a find that matches nothing costs nothing", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-run-empty"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, {});
    const data = (result.output as {
        data: { rows: unknown[]; commerce: { amount_refunded_cents: number } };
    }).data;
    assertEquals(data.rows.length, 0);
    // the whole reservation went back
    assertEquals(data.commerce.amount_refunded_cents, 60);
});

Deno.test("specstream#v1/capacity/executions: a failed status lookup keeps the find alive", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-run-transient"),
    });
    // the 501 and the 503 were the lookup failing, not the find: the run
    // reads again and settles on the receipt
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, { default: 0.35 });
});

Deno.test("specstream#v1/capacity/executions: an expired quote is refused as data, never a run", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-run-rejected"),
    });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { message: string }).message,
        "This quote has expired. Get a new quote and approve it again.",
    );
});

/**
 * Replays `chain`, but the first `lost` POSTs get no answer: `accepted`
 * says whether SpecStream took each one (its recorded answer is used up and
 * thrown away) or never saw it. No network: the chain is the only upstream.
 */
async function withLostStarts(
    chain: Fixture,
    lost: number,
    accepted: boolean,
) {
    const unit = await testSealedUnit(ID);
    const url = unit.doc.request.url;
    const replay = replayFetch(chain, {
        "request.url": url,
        "request.origin": new URL(url).origin,
    });
    const keys: unknown[] = [];
    let dropped = 0;
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: async (input, init) => {
                if ((init?.method ?? "GET") === "POST") {
                    const sent = typeof init?.body === "string"
                        ? JSON.parse(init.body)
                        : {};
                    keys.push(sent.idempotency_key);
                    if (dropped < lost) {
                        dropped++;
                        if (accepted) await replay(input, init);
                        throw new TypeError("connection reset by peer");
                    }
                }
                return await replay(input, init);
            },
        }),
        sleep: () => Promise.resolve(),
    });
    const loaded = await engine.load(unit);
    return { result: await loaded.run(INPUT), keys };
}

/** The ok chain with one more recorded POST answer per resend: SpecStream
 *  answers a repeated key with the run it already started. */
async function chainWithReplays(resends: number): Promise<Fixture> {
    const chain = structuredClone(await fixture("synthetic-run-ok"));
    const post = chain.calls[0];
    assertEquals(post.req.method, "POST");
    const replayed = structuredClone(post);
    (replayed.res.body as { data: { replay: boolean } }).data.replay = true;
    for (let index = 0; index < resends; index++) {
        chain.calls.splice(1, 0, structuredClone(replayed));
    }
    return chain;
}

Deno.test("specstream#v1/capacity/executions: a start whose answer is lost is sent again with the same key and followed to its receipt", async () => {
    const { result, keys } = await withLostStarts(
        await chainWithReplays(1),
        1,
        true,
    );
    // the resend carried the original key, so SpecStream answered with the
    // run it had already started, and that run settles on its receipt
    assertEquals(keys, ["specstream-run-0001", "specstream-run-0001"]);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, { default: 0.35 });
});

Deno.test("specstream#v1/capacity/executions: a start that stays unanswered is read back by its key and settled", async () => {
    const { result, keys } = await withLostStarts(
        await chainWithReplays(1),
        2,
        true,
    );
    // both answers lost: the run is not abandoned, the poll finds it by the
    // key and settles the 35 cents captured
    assertEquals(keys, ["specstream-run-0001", "specstream-run-0001"]);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 0.35 });
});

Deno.test("specstream#v1/capacity/executions: a start SpecStream never received ends with nothing owed", async () => {
    const chain: Fixture = {
        name: "synthetic-run-never-received",
        description: "Neither POST reached SpecStream, so the key has no run.",
        calls: [{
            req: {
                method: "GET",
                url: "{{request.origin}}/v1/capacity/requests/specstream-run-0001/rows",
            },
            res: {
                status: 404,
                body: {
                    error: {
                        code: "not_found",
                        message: "Nothing has run for this request ID.",
                    },
                },
            },
        }],
    };
    const { result, keys } = await withLostStarts(chain, 2, false);
    assertEquals(keys.length, 2);
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage.credits, {});
});

Deno.test("specstream#v1/capacity/executions: stop cancels the find and settles what it had already matched", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-run-stop-settled"),
    });
    const run = { runId: "test-run-1" };
    const started = await loaded.start(INPUT, run);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(INPUT, started.state, run);
    assert(stopped.kind === RunKind.COMPLETED, "the settled cancel completes");
    // cancel keeps the match already found, and that match is charged
    assertEquals(stopped.usage.credits, { default: 0.2 });
    assertEquals(stopped.usage.evidence, { CREDIT: 20 });
});

Deno.test("specstream#v1/capacity/executions: a stop whose charge has not settled is unresolved, not claimed", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-run-stop-unresolved"),
    });
    const run = { runId: "test-run-2" };
    const started = await loaded.start(INPUT, run);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(INPUT, started.state, run);
    assertEquals(stopped.kind, StopKind.UNRESOLVED);
    assert(stopped.kind === StopKind.UNRESOLVED);
    assertEquals(stopped.state.externalRunId, "specstream-run-0001");
});

for (
    const name of [
        "synthetic-run-stop-lookup-failed",
        "synthetic-run-stop-transport",
    ]
) {
    Deno.test(`specstream#v1/capacity/executions: a stop that cannot confirm the cancel is unresolved (${name})`, async () => {
        const loaded = await loadEndpoint({
            unit: await testSealedUnit(ID),
            input: INPUT,
            mode: "replay",
            fixture: await fixture(name),
        });
        const run = { runId: "test-run-3" };
        const started = await loaded.start(INPUT, run);
        assert(started.kind === RunKind.RUNNING);
        const stopped = await loaded.stop(INPUT, started.state, run);
        assertEquals(stopped.kind, StopKind.UNRESOLVED);
        assert(stopped.kind === StopKind.UNRESOLVED);
        assertEquals(stopped.state.externalRunId, "specstream-run-0001");
    });
}

Deno.test("specstream#v1/capacity/executions: the estimate is the approved maximum SpecStream reserves", async () => {
    const unit = await testSealedUnit(ID);
    const promised = await estimateEndpoint(unit, INPUT);
    assertEquals(promised.credits, { default: 0.6 });
    assertEquals(promised.evidence, { CREDIT: 60 });
    const larger = await estimateEndpoint(unit, {
        body: { ...INPUT.body, confirm_max_cents: 12_500 },
    });
    assertEquals(larger.credits, { default: 125 });
});

Deno.test("specstream#v1/capacity/executions: the gate needs the approved quote, its hash, a key and the maximum", async () => {
    const unit = await testSealedUnit(ID);
    const required = unit.doc.input.schema.body?.required as string[];
    for (
        const name of [
            "quote_id",
            "quote_hash",
            "idempotency_key",
            "confirm_max_cents",
        ]
    ) {
        assert(required.includes(name), `${name} must be required`);
    }
    const chain = await fixture("synthetic-run-ok");
    const rejected = (body: Json) =>
        assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body },
                    mode: "replay",
                    fixture: chain,
                }),
            Error,
            "INVALID_INPUT",
        );
    const { confirm_max_cents: _omitted, ...withoutMax } = INPUT.body;
    await rejected(withoutMax);
    await rejected({ ...INPUT.body, idempotency_key: "short" });
    await rejected({ ...INPUT.body, idempotency_key: "k".repeat(129) });
    await rejected({ ...INPUT.body, quote_hash: QUOTE_HASH.slice(1) });
    await rejected({ ...INPUT.body, confirm_max_cents: -1 });
    await rejected({ ...INPUT.body, confirm_max_cents: 1.5 });
    await assertInputAccepted({
        unit,
        input: {
            body: { ...INPUT.body, idempotency_key: "k".repeat(8) },
        },
        mode: "replay",
        fixture: chain,
    });
    await assertInputAccepted({
        unit,
        input: { body: { ...INPUT.body, confirm_max_cents: 0 } },
        mode: "replay",
        fixture: chain,
    });
});

Deno.test({
    name:
        "specstream#v1/capacity/executions live (gated on SPECSTREAM_API_KEY)",
    // This one spends: it runs a real find and reserves the maximum below.
    // Opt in separately from the key.
    ignore: liveSkip("specstream") || !Deno.env.get("SPECSTREAM_LIVE_SPEND"),
    fn: async () => {
        const parsed = await runEndpoint({
            unit: await testSealedUnit("specstream#v1/parse"),
            input: {
                body: { q: "3 dental clinics in Lyon, with their email" },
            },
            mode: "live",
        });
        const hash = (parsed.output as { data: { ast_hash: string } }).data
            .ast_hash;
        const quoted = await runEndpoint({
            unit: await testSealedUnit("specstream#v1/capacity/quotes"),
            input: { body: { ast_hash: hash, requested_units: 3 } },
            mode: "live",
        });
        const quote = (quoted.output as {
            data: {
                quote_id: string;
                quote_hash: string;
                maximum_cents: number;
            };
        }).data;
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    quote_id: quote.quote_id,
                    quote_hash: quote.quote_hash,
                    idempotency_key: crypto.randomUUID(),
                    confirm_max_cents: quote.maximum_cents,
                },
            },
            mode: "live",
        });
        assertEquals(result.isProviderError, false);
        assert(result.usage.credits.default! <= quote.maximum_cents / 100);
    },
});
