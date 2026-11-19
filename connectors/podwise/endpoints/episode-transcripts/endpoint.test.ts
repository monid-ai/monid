import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("podwise#episodes/transcripts happy: $0.036 per episode", async () => {
    const unit = await testSealedUnit("podwise#episodes/transcripts");
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
        credits: { default: 0.036 },
        evidence: { CALL: 1 },
    });
    // the whole recorded body comes through: nothing dropped, nothing added
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("podwise#episodes/transcripts provider error (not transcribed, 404): zero usage", async () => {
    const unit = await testSealedUnit("podwise#episodes/transcripts");
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

Deno.test("podwise#episodes/transcripts schema gate: seq must be a positive decimal string", async () => {
    const unit = await testSealedUnit("podwise#episodes/transcripts");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const bad: RunInput[] = [
        { pathParams: { seq: "948020x" } },
        { pathParams: { seq: "0" } },
    ];
    for (const input of bad) {
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(input),
        );
    }
    // near-twin: valid, so it must clear the schema gate (replay may still
    // fail later on URL matching: it is not the recorded request)
    await assertInputAccepted({
        unit,
        input: { pathParams: { seq: "9480206" } },
        mode: "replay",
        fixture,
    });
});

Deno.test("podwise#episodes/transcripts: translation is refused, never forwarded", async () => {
    const unit = await testSealedUnit("podwise#episodes/transcripts");
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

Deno.test({
    name: "podwise#episodes/transcripts live (gated on PODWISE_API_KEY)",
    ignore: liveSkip("podwise"),
    fn: async () => {
        const unit = await testSealedUnit("podwise#episodes/transcripts");
        const result = await runEndpoint({
            unit,
            input: { pathParams: { seq: "9480205" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as {
            success: boolean;
            result: unknown;
        };
        assertEquals(output.success, true);
        const lines = output.result as Record<string, unknown>[];
        assert(Array.isArray(lines) && lines.length > 0, "transcript lines");
        assertEquals(typeof lines[0].content, "string");
        assertEquals(typeof lines[0].start, "number");
        assertEquals(typeof lines[0].end, "number");
        assertEquals(Object.keys(result.usage.evidence), ["CALL"]);
    },
});
