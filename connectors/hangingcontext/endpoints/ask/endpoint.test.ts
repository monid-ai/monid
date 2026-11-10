import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

/** Hanging Context is keyless: there is no credential for `liveSkip` to
 *  find (its default field is `apiKey`, and an empty field list always
 *  skips), so live tests gate on network permission instead — they run
 *  under `deno task test:live` (--allow-net) and are ignored otherwise. */
const noNet = Deno.permissions.querySync({ name: "net" }).state !==
    "granted";

Deno.test("hangingcontext: keyless FREE provider compiles to bare GETs on one host", async () => {
    const bundle = await testBundle();
    assertEquals(
        bundle.endpoints["hangingcontext#ask"].request.url,
        "https://hangingcontext.com/ask",
    );
    assertEquals(
        bundle.endpoints["hangingcontext#latest"].request.url,
        "https://hangingcontext.com/editions/latest.json",
    );
    assertEquals(
        bundle.endpoints["hangingcontext#topic"].request.url,
        "https://hangingcontext.com/n/{topic}/index.json",
    );
    assertEquals(
        bundle.endpoints["hangingcontext#story"].request.url,
        "https://hangingcontext.com/stories/{date}/{slug}/index.json",
    );
    // FREE (D27): no vendor meter, so no consolidate fn compiles
    for (const id of ["ask", "latest", "topic", "story"]) {
        assertEquals(
            bundle.endpoints[`hangingcontext#${id}`].usage.consolidate,
            undefined,
        );
    }
});

Deno.test("hangingcontext#ask happy (recorded 2026-10-24): cited matches, FREE settle", async () => {
    const unit = await testSealedUnit("hangingcontext#ask");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { query: "federal reserve rates" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output projection: the recorded body IS the contract
    assertEquals(result.output, fixture.calls[0].res.body);
    const output = result.output as Record<string, unknown>;
    assertEquals(output.no_match, false);
    assert((output.results as unknown[]).length > 0, "results present");
});

Deno.test("hangingcontext#ask schema gate: query is required and non-empty at the binding", async () => {
    const unit = await testSealedUnit("hangingcontext#ask");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const bad: Record<string, string>[] = [{}, { query: "" }];
    for (const queryParams of bad) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    // near-twin: a one-character question passes validation (it fails
    // later, at replay URL matching — proving the schema let it through)
    const error = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { queryParams: { query: "f" } },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test("hangingcontext#ask no match (recorded 2026-10-24): empty results are data, zero usage", async () => {
    const unit = await testSealedUnit("hangingcontext#ask");
    const fixture = await loadFixture(`${fixturesDir}no-match.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { query: "zzqqxx nonsense" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.no_match, true);
    assertEquals(output.results, []);
});

Deno.test("hangingcontext#ask provider error (synthetic): 503 is data, zero usage", async () => {
    const unit = await testSealedUnit("hangingcontext#ask");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { query: "anything" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "hangingcontext#ask live (keyless; needs --allow-net)",
    ignore: noNet,
    fn: async () => {
        const unit = await testSealedUnit("hangingcontext#ask");
        const result = await runEndpoint({
            unit,
            input: { queryParams: { query: "artificial intelligence" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert(
            Array.isArray((result.output as Record<string, unknown>).results),
            "results array present",
        );
    },
});
