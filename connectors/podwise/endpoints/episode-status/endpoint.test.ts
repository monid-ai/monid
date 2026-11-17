import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("podwise#episodes/status happy: done, free", async () => {
    const unit = await testSealedUnit("podwise#episodes/status");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { seq: "9480205" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the whole recorded body comes through: nothing dropped, nothing added
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("podwise#episodes/status not_requested: a 200, not an error", async () => {
    const unit = await testSealedUnit("podwise#episodes/status");
    const fixture = await loadFixture(`${fixturesDir}not-requested.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { seq: "9354876" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        success: true,
        result: { status: "not_requested", progress: null },
    });
});

Deno.test("podwise#episodes/status provider error (unknown seq, 404): zero usage", async () => {
    const unit = await testSealedUnit("podwise#episodes/status");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { seq: "999999999" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        success: false,
        error: "not_found",
        message: "Episode not found",
    });
});

Deno.test("podwise#episodes/status schema gate: seq must be a positive decimal string", async () => {
    const unit = await testSealedUnit("podwise#episodes/status");
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
    // near-twin: valid, so it passes the schema and fails later, at replay
    // URL matching (it is not the recorded request)
    const error = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { pathParams: { seq: "9480206" } },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test({
    name: "podwise#episodes/status live (gated on PODWISE_API_KEY)",
    ignore: liveSkip("podwise"),
    fn: async () => {
        const unit = await testSealedUnit("podwise#episodes/status");
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
        const status = output.result as { status: unknown; progress: unknown };
        assert(
            ["done", "processing", "waiting", "not_requested", "failed"]
                .includes(status.status as string),
            JSON.stringify(status),
        );
        assert(
            status.progress === null ||
                (typeof status.progress === "number" &&
                    status.progress >= 0 && status.progress <= 100),
            JSON.stringify(status),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
