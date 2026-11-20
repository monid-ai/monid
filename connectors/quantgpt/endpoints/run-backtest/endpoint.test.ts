import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json, RunInput } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadEndpoint,
    loadFixture,
    replayFetch,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

/**
 * The run_backtest async suite. Every chain is SYNTHETIC (see each
 * fixture's description). The claim under test: a "still running" answer
 * is never a final, billable result. The flat US$0.10 settles exactly once,
 * on the envelope that carries the finished report, whether that arrives in
 * the submit call or through fetch_job.
 */

const ID = "quantgpt#tools/run_backtest";
const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT: RunInput = {
    body: {
        filters: [{ f: "ret_12_1", op: ">", v: 0 }],
        rank_by: "ret_12_1",
        top_n: 20,
    },
};
const ONE_RUN = { credits: { default: 0.1 }, evidence: { CALL: 1 } };
const NOTHING = { credits: {}, evidence: {} };

Deno.test("quantgpt: only run_backtest carries a lifecycle (start and poll, no stop)", async () => {
    const bundle = await testBundle();
    const lifecycle = bundle.endpoints[ID].lifecycle;
    assert(lifecycle, "run_backtest must carry a lifecycle");
    assert(lifecycle.start && lifecycle.poll);
    // no cancel route upstream; an uncollected job is never billed
    assertEquals(lifecycle.stop, undefined);
    for (
        const id of [
            "quantgpt#tools/market_snapshot",
            "quantgpt#tools/grade_stock",
            "quantgpt#tools/search_library",
        ]
    ) {
        assertEquals(bundle.endpoints[id].lifecycle, undefined, id);
    }
});

Deno.test(`${ID} fast run: the finished report in the submit settles once, no poll`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        // one call in the chain: a poll would fail the replay
        fixture: await loadFixture(
            `${fixturesDir}synthetic-backtest-fast.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, ONE_RUN);
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals(output.tool as unknown, "run_backtest");
    assertEquals(
        (output.result.result as Record<string, unknown>).finding,
        "tradeoff",
    );
});

Deno.test(`${ID} slow run: parks RUNNING, polls fetch_job, settles once on the finished report`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-backtest-job.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // three upstream answers (running, running, done), ONE bill
    assertEquals(result.usage, ONE_RUN);
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals(output.tool as unknown, "fetch_job");
    assertEquals(output.result.job_id, "JOB1");
    assert(output.result.status !== "running");
});

Deno.test(`${ID} phase by phase: a running answer carries no usage; only the finished one does`, async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-backtest-job.json`),
    });
    const started = await loaded.start(INPUT);
    assertEquals(started.kind, "RUNNING");
    assert(!("usage" in started), "a running submit must not carry usage");
    if (started.kind !== "RUNNING") throw new Error("unreachable");
    assertEquals(started.state.externalRunId, "JOB1");

    const tick = await loaded.poll(INPUT, started.state);
    assertEquals(tick.kind, "RUNNING");
    assert(!("usage" in tick), "a running poll must not carry usage");
    if (tick.kind !== "RUNNING") throw new Error("unreachable");

    const done = await loaded.poll(INPUT, tick.state);
    assertEquals(done.kind, "COMPLETED");
    if (done.kind !== "COMPLETED") throw new Error("unreachable");
    assertEquals(done.usage, ONE_RUN);
});

Deno.test(`${ID} abandoned while running: stop settles nothing`, async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-backtest-job.json`),
    });
    const started = await loaded.start(INPUT);
    if (started.kind !== "RUNNING") throw new Error("expected RUNNING");
    const stopped = await loaded.stop(INPUT, started.state);
    assertEquals(stopped.kind, "STOPPED_UNSETTLED");
});

Deno.test(`${ID} the poll POSTs {job_id} to fetch_job on the same origin`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-backtest-job.json`,
    );
    const requestUrl = unit.doc.request.url;
    const replay = replayFetch(fixture, {
        "request.url": requestUrl,
        "request.origin": new URL(requestUrl).origin,
    });
    const seen: { method: string; url: string; body: Json | undefined }[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (input, init) => {
                const body = typeof init?.body === "string"
                    ? JSON.parse(init.body) as Json
                    : undefined;
                seen.push({
                    method: init?.method ?? "GET",
                    url: String(input),
                    body,
                });
                return replay(input, init);
            },
        }),
        sleep: () => Promise.resolve(),
    });
    const result = await (await engine.load(unit)).run(INPUT);
    assertEquals(result.usage, ONE_RUN);
    assertEquals(seen.length, 3);
    assertEquals(seen[0].url, requestUrl);
    assertEquals(seen[0].body, INPUT.body as Json);
    const fetchUrl = "https://terminal.quantgpt.co/api/v1/tools/fetch_job";
    for (const poll of seen.slice(1)) {
        assertEquals(poll.method, "POST");
        assertEquals(poll.url, fetchUrl);
        assertEquals(poll.body, { job_id: "JOB1" });
    }
});

Deno.test(`${ID} transient lookups (429, 503) keep the run alive`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-backtest-transient.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, ONE_RUN);
});

Deno.test(`${ID} job failed: terminal, zero-billed, reason kept`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-backtest-failed.json`,
        ),
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, NOTHING);
    assert(
        (result.output as { message: string }).message.startsWith(
            "job failed:",
        ),
    );
});

Deno.test(`${ID} run line full: a 429 on submit is data, never a job`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-backtest-run-line.json`,
        ),
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, NOTHING);
});

Deno.test(`${ID} key revoked or API off (synthetic 404): data, zero usage`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-not-found.json`),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, NOTHING);
});

Deno.test(`${ID} estimate: one finished run`, async () => {
    const promised = await estimateEndpoint(
        await testSealedUnit(ID),
        INPUT,
    );
    assertEquals(promised, ONE_RUN);
});

Deno.test(`${ID} schema gate: the vendor's bounds and enums; unknown keys rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-backtest-fast.json`,
    );
    const rejected: Record<string, Json>[] = [
        {
            filters: Array.from(
                { length: 9 },
                () => ({ f: "x", op: ">", v: 0 }),
            ),
        },
        { filters: [{ f: "ret_12_1", op: "=", v: 0 }] },
        { filters: [{ f: "ret_12_1", op: ">" }] },
        { top_n: 0 },
        { top_n: 101 },
        { start_year: 1980 },
        { rebalance: "yearly" },
        { entry: "open" },
        { stop_loss: 0.95 },
        { max_weight: 0 },
        { vol_window: 30 },
        { random_controls: 101 },
        { portfolio_size: 4 },
        { tickers: 5 },
        { topn: 20 },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    const accepted: Record<string, Json>[] = [
        {},
        {
            filters: [{ f: "synthetic_flag", op: "is", v: true }],
            rank_by: "ret_12_1",
            rank_dir: "asc",
            top_n: 1,
            benchmark: "$SPX",
            start_year: 1990,
            entry: "next_open",
            split_year: 2010,
            rebalance: "weekly",
            stop_loss: 0.1,
            trailing_stop: 0.2,
            dynamic_stop: { atr_mult: 3, atr_days: 14 },
            ma_exit: { days: 200 },
            portfolio_size: 40,
            cash_as_holding: true,
            random_controls: 20,
            tickers: "AAA,BBB",
            weighting: "custom",
            max_weight: 0.5,
            min_weight: 0.01,
            vol_window: 252,
            weights: { AAA: 0.6, BBB: 0.4 },
            name: "synthetic",
        },
        { tickers: ["AAA", "BBB"], dynamic_stop: 2.5, ma_exit: 50 },
    ];
    for (const body of accepted) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
    }
});

Deno.test({
    name:
        `${ID} live (gated on QUANTGPT_API_KEY, a partner key; bills one run)`,
    ignore: liveSkip("quantgpt"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
        const output = result.output as Record<string, Record<string, unknown>>;
        assert(output.result.status !== "running");
    },
});
