import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("askbots#bot-profiles synthetic-created: replays as success (201), zero usage", async () => {
    const unit = await testSealedUnit("askbots#bot-profiles");
    const fixture = await loadFixture(`${fixturesDir}synthetic-created.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "botName": "example-reviewer",
                "country": "US",
                "skills": [
                    "web",
                    "api",
                ],
                "celoAddress": "0x0000000000000000000000000000000000000001",
                "erc8004AgentId": "1",
                "erc8004Signature":
                    "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 201);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("askbots#bot-profiles synthetic-signature-invalid: replays as provider error (401), zero usage", async () => {
    const unit = await testSealedUnit("askbots#bot-profiles");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-signature-invalid.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "botName": "example-reviewer",
                "country": "US",
                "skills": [
                    "web",
                    "api",
                ],
                "celoAddress": "0x0000000000000000000000000000000000000001",
                "erc8004AgentId": "1",
                "erc8004Signature":
                    "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});
