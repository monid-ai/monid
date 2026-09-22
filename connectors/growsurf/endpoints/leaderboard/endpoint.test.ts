import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { assertLiveOk, liveProgramId } from "../../testing.ts";

const ID = "growsurf#campaign/{id}/leaderboard";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    pathParams: { id: "x4t7bd" },
    queryParams: { leaderboardType: "BY_COMMISSIONS" },
};

Deno.test(`${ID} happy: ranked order, last page`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-leaderboard-ok.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);

    const body = result.output as Record<string, unknown>;
    // a null nextId IS the end of the list, and it is a real value rather
    // than an absent key — a caller looping on it must see it
    assertEquals(body.nextId, null);
    const ranked = body.participants as Record<string, unknown>[];
    assertEquals(ranked.map((p) => p.rank), [1, 2]);
});

Deno.test(`${ID} provider error: the affiliate payment-method gate is an ACCOUNT state`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-error-leaderboard.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });

    // 402, not 4xx-because-you-asked-wrong: the request was fine and the
    // team simply has no payment method on file. Pinned because a caller
    // that retries this with different arguments will never succeed.
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} schema gate: an unknown leaderboardType never reaches the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-leaderboard-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { id: "x4t7bd" },
                    queryParams: { leaderboardType: "BY_CLICKS" },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin from the other end of the vocabulary, so the gate
    // is the enum and not a single hardcoded value
    await assertInputAccepted({
        unit,
        input: {
            pathParams: { id: "x4t7bd" },
            queryParams: { leaderboardType: "PREV_MONTH" },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test(`${ID}: the vocabulary is the vendor's nine, and isMonthly is not mirrored`, async () => {
    const unit = await testSealedUnit(ID);
    const queryParams = unit.doc.input.schema.queryParams ?? {};
    const props = (queryParams.properties ?? {}) as unknown as Record<
        string,
        { enum?: string[] } | undefined
    >;
    assertEquals(Object.keys(props), ["nextId", "limit", "leaderboardType"]);
    assertEquals(props.leaderboardType?.enum?.length, 9);
    // deprecated in favour of leaderboardType: CURRENT_MONTH
    assertEquals(props.isMonthly, undefined);
});

Deno.test({
    name: `${ID} live (gated on GROWSURF_API_KEY)`,
    ignore: liveSkip("growsurf"),
    fn: async () => {
        const id = await liveProgramId();
        if (id === undefined) return; // the key's team has no programs
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            // the DEFAULT ordering, so any program type answers — the
            // commission and revenue orderings need an affiliate program
            input: { pathParams: { id }, queryParams: { limit: 1 } },
            mode: "live",
        });
        assertLiveOk(result);
    },
});
