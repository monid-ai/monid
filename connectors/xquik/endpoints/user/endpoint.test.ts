import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "xquik#x/users/{id}";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy: 1 profile bills $0.00015`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "NASA" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.00015 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
    const output = result.output as { username: string; followers: number };
    assertEquals(output.username, "NASA");
    assertEquals(typeof output.followers, "number");
});

Deno.test(`${ID} provider error: 404 user_not_found is data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "xq_no_user_404" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { error: string }).error,
        "user_not_found",
    );
});

Deno.test(`${ID}: a missing id fails INVALID_INPUT, an id passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () => runEndpoint({ unit, input: {}, mode: "replay", fixture }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(
        await estimateEndpoint(unit, { pathParams: { id: "NASA" } }),
        { credits: { default: 0.00015 }, evidence: { CALL: 1 } },
    );
});

Deno.test(`${ID}: a bare search fails INVALID_INPUT, the @search form passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { id: "search" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(
        (await estimateEndpoint(unit, { pathParams: { id: "@search" } }))
            .evidence,
        { CALL: 1 },
    );
});

Deno.test({
    name: `${ID} live (gated on XQUIK_API_KEY)`,
    ignore: liveSkip("xquik"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { pathParams: { id: "NASA" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
        const output = result.output as {
            username: unknown;
            followers: unknown;
        };
        assertEquals(typeof output.username, "string");
        assertEquals(typeof output.followers, "number");
    },
});
