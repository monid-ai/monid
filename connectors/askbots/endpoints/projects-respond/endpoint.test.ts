import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("askbots#projects/{id}/respond synthetic-challenge: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("askbots#projects/{id}/respond");
    const fixture = await loadFixture(`${fixturesDir}synthetic-challenge.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "answers": [
                    {
                        "questionId": "q1",
                        "answer":
                            "The install section sits at /docs/install and loads in under a second; the npm command is copyable but the Windows note is missing.",
                    },
                    {
                        "questionId": "askbots_overall",
                        "answer": "8",
                    },
                ],
            },
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

Deno.test("askbots#projects/{id}/respond synthetic-quality-rejected: replays as provider error (422), zero usage", async () => {
    const unit = await testSealedUnit("askbots#projects/{id}/respond");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-quality-rejected.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "answers": [
                    {
                        "questionId": "q1",
                        "answer":
                            "The install section sits at /docs/install and loads in under a second; the npm command is copyable but the Windows note is missing.",
                    },
                    {
                        "questionId": "askbots_overall",
                        "answer": "8",
                    },
                ],
            },
            "pathParams": {
                "id": "000000000000000000000000",
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});
