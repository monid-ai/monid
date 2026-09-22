import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "growsurf#campaign/{id}/participant/{participantIdOrEmail}/ref";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    pathParams: { id: "k9j2mq", participantIdOrEmail: "i9g2bh" },
    body: {},
};

Deno.test(`${ID} happy: an empty body credits immediately`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-trigger-referral-ok.json`,
        ),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals((result.output as Record<string, unknown>).success, true);
});

Deno.test(`${ID} repeat: 200 with success:false is NOT a provider error`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-trigger-referral-repeat.json`,
        ),
    });

    // the trap this test exists for: GrowSurf answers an
    // already-credited referral with HTTP 200, so the engine classifies it
    // as a SUCCESS and only `success` says what happened. A caller
    // branching on the status code would double-count.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals((result.output as Record<string, unknown>).success, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: the hold is bounded at the vendor's 90 days`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-trigger-referral-ok.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { ...INPUT, body: { delayInDays: 91 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin at the boundary: 90 is the documented maximum
    await assertInputAccepted({
        unit,
        input: { ...INPUT, body: { delayInDays: 90 } },
        mode: "replay",
        fixture,
    });
});

Deno.test(`${ID}: nothing in the body is required — {} is the immediate case`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.input.schema.body?.required, undefined);
});
