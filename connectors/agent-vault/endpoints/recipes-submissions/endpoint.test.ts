import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("agent-vault#v1/recipes/submissions/{id} not-found: replays as provider error (404), zero usage", async () => {
    const unit = await testSealedUnit(
        "agent-vault#v1/recipes/submissions/{id}",
    );
    const fixture = await loadFixture(`${fixturesDir}not-found.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "pathParams": {
                "id": "does-not-exist",
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

Deno.test("agent-vault#v1/recipes/submissions/{id} synthetic-approved: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit(
        "agent-vault#v1/recipes/submissions/{id}",
    );
    const fixture = await loadFixture(`${fixturesDir}synthetic-approved.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "pathParams": {
                "id": "sub_example0001",
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

Deno.test("agent-vault#v1/recipes/submissions/{id} synthetic-needs-human: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit(
        "agent-vault#v1/recipes/submissions/{id}",
    );
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-needs-human.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            "pathParams": {
                "id": "sub_example0001",
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

Deno.test("agent-vault#v1/recipes/submissions/{id} synthetic-pending: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit(
        "agent-vault#v1/recipes/submissions/{id}",
    );
    const fixture = await loadFixture(`${fixturesDir}synthetic-pending.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "pathParams": {
                "id": "sub_example0001",
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
