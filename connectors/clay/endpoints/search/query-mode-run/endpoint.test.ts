import { assert, assertEquals, assertRejects } from "@std/assert";
import type { RunInput } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

/** The fixture urls prove the substitution: /search/query-mode/SEARCH1/run */
const SEARCH_ID = "SEARCH1";

Deno.test("clay#search/query-mode/run happy (recorded): rows are the unit; period_quota rides the output", async () => {
    const unit = await testSealedUnit("clay#search/query-mode/run");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { search_id: SEARCH_ID }, body: { limit: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // Clay reports no meter, so the DERIVED fold settles: 2 rows drawn
    // one-for-one from the annual results quota. No consolidate ⇒ no
    // claim ⇒ no `mismatch` key (zUsage is strict — deep-equality proves
    // its absence).
    assertEquals(result.usage, {
        credits: { search_result: 2 },
        evidence: { RESULT: 2 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals((output.data as unknown[]).length, 2);
    assertEquals(output.has_more, true);
    assertEquals(output.source_type, "people");
    // v1 stripped `period_quota` as an internal ledger; clay declares no
    // output hooks, so Clay's own answer reaches the caller intact — the
    // remaining quota is useful to whoever is paging
    assert("period_quota" in output);
});

Deno.test("clay#search/query-mode/run empty (recorded): an exhausted iterator draws nothing", async () => {
    const unit = await testSealedUnit("clay#search/query-mode/run");
    const fixture = await loadFixture(`${fixturesDir}empty.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { search_id: SEARCH_ID }, body: { limit: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // zero rows ⇒ zero draw (a zero credit entry is pruned), while
    // evidence still reports that we counted
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    assertEquals(
        (result.output as Record<string, unknown>).exhaustion_reason,
        "no_more_results",
    );
});

Deno.test("clay#search/query-mode/run provider error (recorded 404): expired search is data, zero usage", async () => {
    const unit = await testSealedUnit("clay#search/query-mode/run");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { search_id: "search_0tExPiReDnOtReAl" },
            body: { limit: 2 },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // relayed verbatim — the message is the actionable part (re-create
    // the search), so it must reach the caller
    assertEquals(result.output, { message: "Search not found or expired" });
});

Deno.test("clay#search/query-mode/run: limit is REQUIRED and bounded; search_id is validated before the wire", async () => {
    const unit = await testSealedUnit("clay#search/query-mode/run");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: RunInput[] = [
        // the primary limiting knob is the estimate's whole basis (D25)
        { pathParams: { search_id: SEARCH_ID }, body: {} },
        // vendor bounds (1-500)
        { pathParams: { search_id: SEARCH_ID }, body: { limit: 0 } },
        { pathParams: { search_id: SEARCH_ID }, body: { limit: 501 } },
        { pathParams: { search_id: SEARCH_ID }, body: { limit: 2.5 } },
        // .strict() survives compilation
        {
            pathParams: { search_id: SEARCH_ID },
            body: { limit: 2, offset: 10 },
        },
        // the iterator handle is a first-class validated slot
        { pathParams: { search_id: "" }, body: { limit: 2 } },
    ];
    for (const input of rejected) {
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(input),
        );
    }
    // a missing path param is caught at substitution, also before the wire
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { limit: 2 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: "clay#search/query-mode/run live (gated on CLAY_API_KEY)",
    ignore: liveSkip("clay"),
    fn: async () => {
        // the iterator handle only exists once a search is created, so the
        // live case runs the real two-step flow
        const create = await runEndpoint({
            unit: await testSealedUnit("clay#search/query-mode"),
            input: {
                body: {
                    query:
                        'select from people where experiences.any(is_current = true and job_title is_similar_to ("VP Sales"))',
                },
            },
            mode: "live",
        });
        assertEquals(
            create.isProviderError,
            false,
            JSON.stringify(create.output),
        );
        const searchId = (create.output as Record<string, unknown>)
            .search_id as string;
        assert(typeof searchId === "string" && searchId.length > 0);
        // creating draws nothing
        assertEquals(create.usage, { credits: {}, evidence: {} });

        const result = await runEndpoint({
            unit: await testSealedUnit("clay#search/query-mode/run"),
            input: { pathParams: { search_id: searchId }, body: { limit: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // rows vary; the draw is one-for-one with whatever came back
        const rows =
            ((result.output as Record<string, unknown>).data as unknown[])
                .length;
        assertEquals(result.usage.evidence, { RESULT: rows });
        assertEquals(
            result.usage.credits,
            rows > 0 ? { search_result: rows } : {},
        );
    },
});
