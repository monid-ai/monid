import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "growsurf#campaign/{id}/participant";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

/**
 * NO LIVE TEST, deliberately — the same for the other two write endpoints.
 * A live run of this call enrolls a real person in a real customer's
 * program and sends them whatever that program's welcome email is. There
 * is no read-only form of it and no sandbox to point at, so the live gate
 * stays shut and the replayed chains carry the contract. `#campaigns`
 * holds the connector's one live test.
 */

Deno.test(`${ID} happy: the answer carries the referral link`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-add-participant-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { id: "k9j2mq" },
            body: {
                email: "gavin@hooli.com",
                firstName: "Gavin",
                lastName: "Belson",
                metadata: { customerId: "12345" },
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);

    const p = result.output as Record<string, unknown>;
    // shareUrl is why the call exists — it is the link the participant
    // shares, and it must reach the caller unprojected
    assertEquals(p.shareUrl, "https://piedpiper.com?grsf=gavin-f8g9nl");
    assertEquals(p.metadata, { customerId: "12345" });
});

Deno.test(`${ID} provider error: a blocked participant is refused, and bills nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-error-add-participant.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { id: "k9j2mq" },
            body: { email: "gavin@hooli.com" },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} schema gate: a malformed email never reaches the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-add-participant-ok.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { id: "k9j2mq" },
                    body: { email: "gavin-at-hooli" },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin, so the gate is a format check and not a refusal
    // of everything: email alone is the whole required body
    await assertInputAccepted({
        unit,
        input: {
            pathParams: { id: "k9j2mq" },
            body: { email: "gavin@hooli.com" },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test(`${ID}: email is the only required field, and the identity does not collide`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.input.schema.body?.required, ["email"]);
    // the bare /participant path, distinct from the
    // {participantIdOrEmail} read (design D22) — declaring no explicit
    // `endpoint` is safe precisely because the two paths already differ
    assertEquals(
        unit.doc.request.url,
        "https://api.growsurf.com/v2/campaign/{id}/participant",
    );
});
