import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "datahyena#exec-moves";
const INPUT = { queryParams: { "roleSeniority": ["c_level"], "limit": 2 } };

Deno.test(`${ID} happy (synthetic): rows are the unit; the creditsUsed claim wins; creditsRemaining stripped`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { RESULT: 2 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.meta, {});
    assertEquals((output.data as unknown[]).length, 2);
});

Deno.test(`${ID} empty (synthetic): zero rows bill nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID}: limit is required and capped at 100`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    for (const limit of [undefined, 0, 101]) {
        const queryParams: Record<string, Json> = {
            ...INPUT.queryParams,
            limit: limit ?? null,
        };
        if (limit === undefined) delete queryParams.limit;
        await assertRejects(() =>
            runEndpoint({
                unit,
                input: { queryParams },
                mode: "replay",
                fixture,
            })
        );
    }
});
