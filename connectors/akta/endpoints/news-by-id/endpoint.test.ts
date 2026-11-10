import { assertAlmostEquals, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "akta#v1/news/by-id";

Deno.test("akta#v1/news/by-id happy (synthetic): 0.1 base + 0.01 per delivered article", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { queryParams: { news_ids: [34144849, 34186756] } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.12 },
        evidence: { article: 2, request: 1 },
    });
    // the vendor meter is absorbed out of the payload
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_consumed" in output, false);
});

Deno.test("akta#v1/news/by-id estimate: the caller-stated quantity at the published card", async () => {
    const usage = await estimateEndpoint(
        await testSealedUnit(ID),
        { queryParams: { news_ids: [34144849, 34186756] } },
    );
    const expected = {
        credits: { default: 0.12 },
        evidence: { article: 2, request: 1 },
    };
    assertEquals(usage.evidence, expected.evidence);
    // the fold may carry float dust the literal does not
    assertAlmostEquals(usage.credits.default ?? 0, expected.credits.default);
});

Deno.test("akta#v1/news/by-id schema gate: ids are positive integers, at least one (v1 parity)", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const [why, queryParams] of [
            ["no ids", { news_ids: [] }],
            ["a string id", { news_ids: ["34144849"] }],
            ["a zero id", { news_ids: [0] }],
        ] as [string, Record<string, Json>][]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { queryParams }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    }
    for (
        const queryParams of [
            { news_ids: [1] },
        ] as Record<string, Json>[]
    ) {
        await assertInputAccepted({
            unit,
            input: { queryParams },
            mode: "replay",
        });
    }
});
