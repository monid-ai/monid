import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
/** Keyless: gate live tests on network permission (see ask's test). */
const noNet = Deno.permissions.querySync({ name: "net" }).state !==
    "granted";

Deno.test("hangingcontext#latest happy (recorded 2026-10-24): the edition, FREE settle", async () => {
    const unit = await testSealedUnit("hangingcontext#latest");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
    const output = result.output as Record<string, unknown>;
    assert((output.stories as unknown[]).length > 0, "stories present");
    assert(Array.isArray(output.newsrooms), "topics listed");
});

Deno.test("hangingcontext#latest provider error (synthetic): 503 is data, zero usage", async () => {
    const unit = await testSealedUnit("hangingcontext#latest");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "hangingcontext#latest live (keyless; needs --allow-net)",
    ignore: noNet,
    fn: async () => {
        const unit = await testSealedUnit("hangingcontext#latest");
        const result = await runEndpoint({ unit, input: {}, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert(
            Array.isArray((result.output as Record<string, unknown>).stories),
            "stories array present",
        );
    },
});
