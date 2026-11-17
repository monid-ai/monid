import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

// Endpoint-level fixtures, where `deno task record` writes them. The
// synthetic- files are HAND-WRITTEN until a recording replaces them.
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const ID = "trustmebro#v1/verify";
const CLAIM = "Humans use only 10% of their brain.";

Deno.test("trustmebro#verify retrieved (recorded): bills the retrieved line only", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}retrieved.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { claim: CLAIM } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.003 },
        evidence: { retrieved: 1, constructed: 0 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("trustmebro#verify constructed (recorded): bills the constructed line only", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}constructed.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { claim: CLAIM } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { constructed: 1, retrieved: 0 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

for (
    const [scenario, status] of [["402", 402], ["429", 429], [
        "503",
        503,
    ]] as const
) {
    Deno.test(`trustmebro#verify ${scenario} (hand-written): settles at zero`, async () => {
        const unit = await testSealedUnit(ID);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-${scenario}.json`,
        );
        const result = await runEndpoint({
            unit,
            input: { body: { claim: CLAIM } },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const text = JSON.stringify(result.output);
        // TMB wallet fields never reach the agent
        for (const leaked of ["balance_usd", "needed_usd", "topup_url"]) {
            assertEquals(text.includes(leaked), false, `${leaked} leaked`);
        }
    });
}

Deno.test("trustmebro#verify: claim bounds are enforced by the compiled schema", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}retrieved.json`);
    for (const claim of ["", "   ", "x".repeat(601)]) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: { claim } },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    // exactly 600 characters passes validation
    const ok = await runEndpoint({
        unit,
        input: { body: { claim: "x".repeat(600) } },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.httpStatus, 200);
});

Deno.test({
    name: "trustmebro#verify live (gated on TRUSTMEBRO_CREDENTIALS_API_KEY)",
    ignore: liveSkip("trustmebro"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { claim: CLAIM } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});

Deno.test("trustmebro#verify unknown source (hand-written): falls back to the cheaper retrieved line", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-unknown-source.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { claim: CLAIM } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 0.003 });
    assertEquals(result.usage.evidence.constructed ?? 0, 0);
});

Deno.test("trustmebro#verify 422 with a list detail (hand-written): message is kept, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-422-list.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { claim: CLAIM } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const message = (result.output as Record<string, unknown>).message;
    assertEquals(String(message).includes("at most 600 characters"), true);
});
