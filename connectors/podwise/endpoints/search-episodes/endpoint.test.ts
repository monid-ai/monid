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

Deno.test("podwise#episodes/search happy: $0.006 per call", async () => {
    const unit = await testSealedUnit("podwise#episodes/search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "Paul Christiano", hitsPerPage: 3 } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.006 },
        evidence: { CALL: 1 },
    });
    // the whole recorded body comes through: nothing dropped, nothing added
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("podwise#episodes/search provider error (invalid token, 401): zero usage", async () => {
    const unit = await testSealedUnit("podwise#episodes/search");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "Paul Christiano", hitsPerPage: 3 } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { success: false, message: "Invalid token" });
});

Deno.test("podwise#episodes/search schema gate: q non-empty, hitsPerPage 1-30", async () => {
    const unit = await testSealedUnit("podwise#episodes/search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const bad: RunInput[] = [
        { queryParams: { q: "" } },
        { queryParams: { q: "Paul Christiano", hitsPerPage: 31 } },
        { queryParams: { q: "Paul Christiano", hitsPerPage: 0 } },
        { queryParams: { q: "Paul Christiano", page: -1 } },
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
            input: { queryParams: { q: "Paul Christiano", hitsPerPage: 30 } },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test("podwise#episodes/search: hitsPerPage defaults to 20 at the binding", async () => {
    const unit = await testSealedUnit("podwise#episodes/search");
    const properties = unit.doc.input.schema.queryParams?.properties as Record<
        string,
        { default?: unknown }
    >;
    assertEquals(properties.hitsPerPage.default, 20);
    assertEquals(properties.page.default, 0);
});

Deno.test({
    name: "podwise#episodes/search live (gated on PODWISE_API_KEY)",
    ignore: liveSkip("podwise"),
    fn: async () => {
        const unit = await testSealedUnit("podwise#episodes/search");
        const result = await runEndpoint({
            unit,
            input: { queryParams: { q: "Paul Christiano", hitsPerPage: 2 } },
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
        const hits = output.result as Record<string, unknown>[];
        assert(Array.isArray(hits), "result is an array");
        for (const hit of hits) assertEquals(typeof hit.seq, "number");
        assertEquals(Object.keys(result.usage.evidence), ["CALL"]);
    },
});
