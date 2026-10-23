import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("askbots#auth/openclaw missing-name: replays as provider error (400), zero usage", async () => {
    const unit = await testSealedUnit("askbots#auth/openclaw");
    const fixture = await loadFixture(`${fixturesDir}missing-name.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {},
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

Deno.test("askbots#auth/openclaw register: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("askbots#auth/openclaw");
    const fixture = await loadFixture(`${fixturesDir}register.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "name": "monid-connector-recording",
                "description":
                    "Throwaway reviewer account used once to record fixtures for the Monid AskBots connector. It does not review projects.",
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

Deno.test("askbots#auth/openclaw: the api key is optional (registration is keyless)", async () => {
    const unit = await testSealedUnit("askbots#auth/openclaw");
    const credentials = unit.doc.auth.credentials as { required?: string[] };
    assertEquals(credentials.required ?? [], []);
});
