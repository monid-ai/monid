import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "growsurf#campaign/{id}/leaderboard";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: ranked order, last page`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-leaderboard-ok.json`);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { id: "x4t7bd" },
            queryParams: { leaderboardType: "BY_COMMISSIONS" },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });

    const body = result.output as Record<string, unknown>;
    // a null nextId IS the end of the list, and it is a real value rather
    // than an absent key — a caller looping on it must see it
    assertEquals(body.nextId, null);
    const ranked = body.participants as Record<string, unknown>[];
    assertEquals(ranked.map((p) => p.rank), [1, 2]);
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
