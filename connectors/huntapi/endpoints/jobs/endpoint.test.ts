import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const input = {
    "pathParams": { "id": "01a1c71d-153b-117e-781c-b8fe35fb9824" },
};

Deno.test("huntapi#v1/jobs/{id} happy (synthetic): free; payload rides through", async () => {
    const unit = await testSealedUnit("huntapi#v1/jobs/{id}");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-jobs-ok.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("huntapi#v1/jobs/{id} provider error (synthetic 401): data, zero usage", async () => {
    const unit = await testSealedUnit("huntapi#v1/jobs/{id}");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-jobs-unauthorized.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("huntapi#v1/jobs/{id}: id required; unknown keys rejected", async () => {
    const unit = await testSealedUnit("huntapi#v1/jobs/{id}");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-jobs-ok.json`,
    );
    const rejected: Record<string, string>[] = [
        {},
        { "id": "" },
    ];
    for (const params of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { pathParams: params },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(params),
        );
    }
});

Deno.test({
    name: "huntapi#v1/jobs/{id} live (gated on HUNTAPI_API_KEY)",
    ignore: liveSkip("huntapi"),
    fn: async () => {
        const unit = await testSealedUnit("huntapi#v1/jobs/{id}");
        const result = await runEndpoint({ unit, input, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});
