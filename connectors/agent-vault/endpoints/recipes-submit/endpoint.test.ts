import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("agent-vault#v1/recipes/submissions invalid-recipe: replays as provider error (400), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/recipes/submissions");
    const fixture = await loadFixture(`${fixturesDir}invalid-recipe.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "recipe": {},
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("agent-vault#v1/recipes/submissions synthetic-accepted: replays as success (202), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/recipes/submissions");
    const fixture = await loadFixture(`${fixturesDir}synthetic-accepted.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "recipe": {
                    "kind": "merchant",
                    "id": "shop.example.com",
                    "hosts": [
                        "shop.example.com",
                    ],
                    "status": "unverified",
                },
                "note": "Drove the checkout to the payment step.",
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 202);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("agent-vault#v1/recipes/submissions: GET and POST /v1/recipes get distinct ids", async () => {
    const read = await testSealedUnit("agent-vault#v1/recipes");
    const write = await testSealedUnit("agent-vault#v1/recipes/submissions");
    assertEquals(read.doc.request.method, "GET");
    assertEquals(write.doc.request.method, "POST");
    assertEquals(read.doc.request.url, write.doc.request.url);
});
