import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "growsurf#campaign/{id}/participant/{participantIdOrEmail}";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: an EMAIL ADDRESS in the path is url-encoded by the engine`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-participant-ok.json`);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: {
                id: "x4t7bd",
                // passed PLAIN — the fixture's recorded url carries
                // monica%40raviga.com, so this run only replays if the
                // engine encoded the @ on the way out
                participantIdOrEmail: "monica@raviga.com",
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });

    const p = result.output as Record<string, unknown>;
    assertEquals(p.isAffiliate, true);
    assertEquals(p.affiliateStatus, "APPROVED");
    // what the affiliate still has to do before they can be paid
    assertEquals(
        (p.payoutSettings as { requiredActions: string[] }).requiredActions,
        ["PAYOUT_DESTINATION"],
    );
});

Deno.test(`${ID} schema gate: both path parts are required and non-empty`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-participant-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { id: "x4t7bd" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin: a bare participant ID is just as valid as an
    // email address, which is the whole point of this path parameter
    await assertInputAccepted({
        unit,
        input: {
            pathParams: { id: "x4t7bd", participantIdOrEmail: "h8kp6l" },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test(`${ID}: identity is the vendor's own path`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        unit.doc.request.url,
        "https://api.growsurf.com/v2/campaign/{id}/participant/" +
            "{participantIdOrEmail}",
    );
    assertEquals(unit.doc.input.schema.pathParams?.required, [
        "id",
        "participantIdOrEmail",
    ]);
});
