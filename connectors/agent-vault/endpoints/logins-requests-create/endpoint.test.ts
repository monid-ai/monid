import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("agent-vault#v1/logins/requests invalid-website: replays as provider error (403), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/logins/requests");
    const fixture = await loadFixture(`${fixturesDir}invalid-website.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "website": "not a domain",
                "email": "user@example.com",
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

Deno.test("agent-vault#v1/logins/requests synthetic-pending: replays as success (202), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/logins/requests");
    const fixture = await loadFixture(`${fixturesDir}synthetic-pending.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "website": "shop.example.com",
                "email": "agent@example.com",
                "minLength": 12,
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

Deno.test("agent-vault#v1/logins/requests synthetic-pre-approved: replays as success (202), zero usage", async () => {
    const unit = await testSealedUnit("agent-vault#v1/logins/requests");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-pre-approved.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "website": "shop.example.com",
                "email": "agent@example.com",
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
