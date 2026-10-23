import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "bloomberry#vendors/all_vendors.json";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): free catalog — zero usage, array relayed`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: {} },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // FREE model: nothing folds, nothing is evidenced
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as { name: string; category: string }[];
    // the recorder trims arrays to 2 — the live catalog is 1,700+ rows
    assertEquals(output.length, 2);
    assertEquals(typeof output[0].name, "string");
    assertEquals(typeof output[0].category, "string");
});

// No recorded 401 for this endpoint: the free catalog does not validate
// the key at all (observed 2026-10-20 — a bad key still returns the full
// catalog with HTTP 200), so there is no provider error to replay.

Deno.test(`${ID}: show_counts must be a boolean, not a string`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { show_counts: "yes" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the boolean twin clears validation (it then fails at replay URL
    // matching, since the fixture was recorded without the flag —
    // proving the schema let it through)
    const error = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { queryParams: { show_counts: true } },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test({
    name: `${ID} live (gated on BLOOMBERRY_CREDENTIALS_API_KEY; free)`,
    ignore: liveSkip("bloomberry"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: {} },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 300),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals((result.output as unknown[]).length > 1000, true);
    },
});
