import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
/** Keyless: gate live tests on network permission (see ask's test). */
const noNet = Deno.permissions.querySync({ name: "net" }).state !==
    "granted";

Deno.test("hangingcontext#topic happy (recorded 2026-10-24): one topic, FREE settle", async () => {
    const unit = await testSealedUnit("hangingcontext#topic");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { topic: "artificial-intelligence" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
    const output = result.output as Record<string, unknown>;
    assertEquals(output.id, "artificial-intelligence");
    assert((output.stories as unknown[]).length > 0, "stories present");
});

Deno.test("hangingcontext#topic schema gate: slug shape is lowercase kebab-case", async () => {
    const unit = await testSealedUnit("hangingcontext#topic");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    for (
        const topic of [
            "Artificial-Intelligence",
            "artificial_intelligence",
            "",
        ]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { pathParams: { topic } },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    // near-twin: a well-formed slug that is not in the fixture passes
    // validation (it fails later, at replay URL matching)
    const error = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { pathParams: { topic: "artificial-intelligence-2" } },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test("hangingcontext#topic unknown topic (recorded 2026-10-24): 404 is data, zero usage", async () => {
    const unit = await testSealedUnit("hangingcontext#topic");
    const fixture = await loadFixture(`${fixturesDir}not-found.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { topic: "zzz-nope" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "hangingcontext#topic live (keyless; needs --allow-net)",
    ignore: noNet,
    fn: async () => {
        const unit = await testSealedUnit("hangingcontext#topic");
        const result = await runEndpoint({
            unit,
            input: { pathParams: { topic: "finance-investing" } },
            mode: "live",
        });
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
