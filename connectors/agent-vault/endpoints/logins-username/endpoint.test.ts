import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("agent-vault#v1/logins/username synthetic-already-set: replays as provider error (409), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/logins/username");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-already-set.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "label": "shop.example.com",
                "username": "another_user",
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("agent-vault#v1/logins/username synthetic-set: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/logins/username");
    const fixture = await loadFixture(`${fixturesDir}synthetic-set.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "label": "shop.example.com",
                "username": "example_user",
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

Deno.test("agent-vault#v1/logins/username unknown-login: replays as provider error (403), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/logins/username");
    const fixture = await loadFixture(`${fixturesDir}unknown-login.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "label": "does-not-exist",
                "username": "example_user",
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 403);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});
