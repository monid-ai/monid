import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("askbots#projects/{id}/verify-challenge synthetic-paid: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("askbots#projects/{id}/verify-challenge");
    const fixture = await loadFixture(`${fixturesDir}synthetic-paid.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "challengeId": "ch_example0001",
                "answer": "10063",
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

Deno.test("askbots#projects/{id}/verify-challenge synthetic-too-slow: replays as provider error (403), zero usage", async () => {
    const unit = await testSealedUnit("askbots#projects/{id}/verify-challenge");
    const fixture = await loadFixture(`${fixturesDir}synthetic-too-slow.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "challengeId": "ch_example0003",
                "answer": "10063",
            },
            "pathParams": {
                "id": "000000000000000000000000",
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

Deno.test("askbots#projects/{id}/verify-challenge synthetic-unpaid: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("askbots#projects/{id}/verify-challenge");
    const fixture = await loadFixture(`${fixturesDir}synthetic-unpaid.json`);
    const result = await runEndpoint({
        unit,
        input: {
            "body": {
                "challengeId": "ch_example0002",
                "answer": "10063",
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

Deno.test("askbots#projects/{id}/verify-challenge: request timeout leaves room for the on-chain payout", async () => {
    const unit = await testSealedUnit("askbots#projects/{id}/verify-challenge");
    // The 2 s window is the challenge window, not the request budget: the
    // payout is confirmed on-chain inside this same request.
    assert(unit.doc.timeouts.requestMs >= 10_000);
});
