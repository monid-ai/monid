import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("agent-vault#v1/recipes index: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/recipes");
    const fixture = await loadFixture(`${fixturesDir}index.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("agent-vault#v1/recipes lookup-hit: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/recipes");
    const fixture = await loadFixture(`${fixturesDir}lookup-hit.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "queryParams": {
                "url": "https://www.advanceautoparts.com/checkout",
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

Deno.test("agent-vault#v1/recipes: public lookup, the api key is optional and never sent", async () => {
    const unit = await testSealedUnit("agent-vault#v1/recipes");
    const credentials = unit.doc.auth.credentials as { required?: string[] };
    assertEquals(credentials.required ?? [], []);
});
