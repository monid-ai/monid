import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
/** Keyless: gate live tests on network permission (see ask's test). */
const noNet = Deno.permissions.querySync({ name: "net" }).state !==
    "granted";

const DATE = "2026-10-24";
const SLUG = "world-series-game1-anatomy";

Deno.test("hangingcontext#story happy (recorded 2026-10-24): full story with cited Manifests, FREE settle", async () => {
    const unit = await testSealedUnit("hangingcontext#story");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { date: DATE, slug: SLUG } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
    const output = result.output as Record<string, unknown>;
    assert(
        (output.cited_manifest_ids as unknown[]).length > 0,
        "cited Manifests present",
    );
});

Deno.test("hangingcontext#story schema gate: calendar date and slug shape", async () => {
    const unit = await testSealedUnit("hangingcontext#story");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    for (
        const pathParams of [
            { date: DATE, slug: `${SLUG}_` },
            { date: DATE, slug: "ab" },
            { date: "2026-02-30", slug: SLUG },
            { date: "26-10-24", slug: SLUG },
        ]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { pathParams },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    // near-twin: a well-formed slug not in the fixture passes validation
    // (it fails later, at replay URL matching)
    const error = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { pathParams: { date: DATE, slug: `${SLUG}-2` } },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test("hangingcontext#story not found (recorded 2026-10-24): 404 is data, zero usage", async () => {
    const unit = await testSealedUnit("hangingcontext#story");
    const fixture = await loadFixture(`${fixturesDir}not-found.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { date: "2026-01-01", slug: "no-such-story" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "hangingcontext#story live (keyless; needs --allow-net)",
    ignore: noNet,
    fn: async () => {
        const unit = await testSealedUnit("hangingcontext#story");
        // a live story: the first one in the current edition
        const latest = await testSealedUnit("hangingcontext#latest");
        const edition = await runEndpoint({
            unit: latest,
            input: {},
            mode: "live",
        });
        const stories = (edition.output as Record<string, unknown>)
            .stories as Array<Record<string, unknown>>;
        const parts = String(stories[0].url).replace(/\/$/, "").split("/");
        const result = await runEndpoint({
            unit,
            input: {
                pathParams: {
                    date: parts[parts.length - 2],
                    slug: parts[parts.length - 1],
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert(
            Array.isArray(
                (result.output as Record<string, unknown>).cited_manifest_ids,
            ),
            "cited Manifests present",
        );
    },
});
