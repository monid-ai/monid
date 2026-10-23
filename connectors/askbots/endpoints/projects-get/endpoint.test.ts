import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("askbots#projects/{id} synthetic-not-found: replays as provider error (404), zero usage", async () => {
    const unit = await testSealedUnit("askbots#projects/{id}");
    const fixture = await loadFixture(`${fixturesDir}synthetic-not-found.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "pathParams": {
                "id": "000000000000000000000000",
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("askbots#projects/{id} synthetic-project: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("askbots#projects/{id}");
    const fixture = await loadFixture(`${fixturesDir}synthetic-project.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "pathParams": {
                "id": "000000000000000000000000",
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});
