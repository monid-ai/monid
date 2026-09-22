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
const PATH = { id: "k9j2mq", participantIdOrEmail: "i9g2bh" };
const INPUT = { pathParams: PATH, body: {} };

/** NO LIVE TEST: a live run credits a real referral in a real customer's
 *  program and can award a real reward. See add-participant's note. */

Deno.test(`${ID} happy: an empty body credits immediately`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-trigger-referral-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals((result.output as Record<string, unknown>).success, true);
});

Deno.test(`${ID} repeat: 200 with success:false is NOT a provider error`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-trigger-referral-repeat.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });

    // the trap this test exists for: GrowSurf answers an
    // already-credited referral with HTTP 200, so the engine classifies it
    // as a SUCCESS and only `success` says what happened. A caller
    // branching on the status code would double-count.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals((result.output as Record<string, unknown>).success, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} provider error: an unknown participant is a real 400`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-error-trigger-referral.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });

    // distinct from the repeat above: THIS one really is a provider error,
    // so the two 'nothing was credited' shapes are told apart here
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
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

Deno.test(`${ID}: nothing in the body is required, but the body itself is`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.input.schema.body?.required, undefined);

    // ENGINE BEHAVIOUR, pinned so it is deliberate rather than a surprise:
    // validateInput coerces an ABSENT body to `null` before validating it
    // against a declared body schema, so omitting the body fails the gate
    // even though GrowSurf itself accepts a bodyless POST here. `{}` is
    // the spelling, and meta.notes says so on the doc `inspect` returns.
    // This is engine-wide (23 endpoints across the repo declare an
    // all-optional body), not specific to this connector, so the fix
    // belongs in engine/request.ts rather than here.
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: PATH },
                mode: "replay",
                fixture: undefined,
            }),
        Error,
        "INVALID_INPUT",
    );
});
