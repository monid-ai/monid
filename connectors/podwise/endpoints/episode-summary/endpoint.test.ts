import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("podwise#episodes/summary happy: $0.012 per episode", async () => {
    const unit = await testSealedUnit("podwise#episodes/summary");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { seq: "9480205" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.012 },
        evidence: { CALL: 1 },
    });
    const summary = (result.output as { result: Record<string, unknown> })
        .result;
    assertEquals(typeof summary.summary, "string");
    assertEquals(Array.isArray(summary.chapters), true);
});

Deno.test("podwise#episodes/summary not transcribed: 404 settles at zero", async () => {
    const unit = await testSealedUnit("podwise#episodes/summary");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { seq: "9354876" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        success: false,
        error: "not_transcribed",
        message: "Episode has not been transcribed yet",
    });
});

Deno.test("podwise#episodes/summary: translation is refused, never forwarded", async () => {
    const unit = await testSealedUnit("podwise#episodes/summary");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { seq: "9480205" },
                    queryParams: { translation: "Chinese" },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});
