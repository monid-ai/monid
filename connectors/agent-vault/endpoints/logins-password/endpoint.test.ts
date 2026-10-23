import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("agent-vault#v1/logins/password synthetic-not-rotatable: replays as provider error (409), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/logins/password");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-not-rotatable.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "label": "shop.example.com",
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

Deno.test("agent-vault#v1/logins/password synthetic-rotated: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/logins/password");
    const fixture = await loadFixture(`${fixturesDir}synthetic-rotated.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "label": "shop.example.com",
                "minLength": 20,
                "noSymbols": true,
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

Deno.test("agent-vault#v1/logins/password unknown-login: replays as provider error (403), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/logins/password");
    const fixture = await loadFixture(`${fixturesDir}unknown-login.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "label": "does-not-exist",
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
