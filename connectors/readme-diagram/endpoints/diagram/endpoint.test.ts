import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "readme-diagram#diagram";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { pathParams: { owner: "flisk-sh", repo: "pages" } };

Deno.test(`${ID} happy: the whole SVG as a string, free, no credentials`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(typeof result.output, "string");
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} provider error: a 404 is data, zero usage, plain text untouched`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { owner: "nonexistent-zz", repo: "none-zz" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, "not-found");
});

Deno.test(`${ID}: the schema gate — owner and repo are required, and a valid pair passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const run = (pathParams: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { pathParams: pathParams as Record<string, string> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            {},
            { owner: "flisk-sh" },
            { repo: "pages" },
            { owner: "", repo: "pages" },
            { owner: "flisk-sh", repo: "pages", ref: "main" },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin: another valid pair clears the gate (it then misses the
    // replay URL, which is the point: validation let it through)
    await assertInputAccepted({
        unit,
        input: { pathParams: { owner: "flisk-sh", repo: "readme-diagram" } },
        mode: "replay",
        fixture,
    });
});

// Keyless provider: liveSkip("readme-diagram", []) has no credential fields
// to open on, so it is always true. README_DIAGRAM_LIVE=1 is the explicit
// opt-in that lets the live test run.
Deno.test({
    name: `${ID} live (no key needed; set README_DIAGRAM_LIVE=1 to run)`,
    ignore: liveSkip("readme-diagram", []) &&
        Deno.env.get("README_DIAGRAM_LIVE") !== "1",
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            String(result.output).slice(0, 500),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        // shape, never values: the picture of a live README changes
        assert(typeof result.output === "string");
        assert(result.output.startsWith("<svg "));
        assert(result.output.trimEnd().endsWith("</svg>"));
    },
});
