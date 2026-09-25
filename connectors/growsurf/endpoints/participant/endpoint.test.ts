import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { assertLiveOk, liveProgramId } from "../../testing.ts";

const ID = "growsurf#campaign/{id}/participant/{participantIdOrEmail}";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
// passed PLAIN — the fixtures' recorded urls carry monica%40raviga.com, so
// these runs only replay if the engine encoded the @ on the way out
const INPUT = {
    pathParams: { id: "x4t7bd", participantIdOrEmail: "monica@raviga.com" },
};

Deno.test(`${ID} happy: an EMAIL ADDRESS in the path is url-encoded by the engine`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-participant-ok.json`);
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

    const p = result.output as Record<string, unknown>;
    assertEquals(p.isAffiliate, true);
    assertEquals(p.affiliateStatus, "APPROVED");
    // what the affiliate still has to do before they can be paid
    assertEquals(
        (p.payoutSettings as { requiredActions: string[] }).requiredActions,
        ["PAYOUT_DESTINATION"],
    );
});

Deno.test(`${ID} provider error: an unknown participant answers 400, NOT 404`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-error-participant.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });

    // the status is the surprise worth pinning: a caller checking for 404
    // to mean "not enrolled" would read this as a malformed request
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "PARTICIPANT_NOT_FOUND",
    );
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
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

Deno.test({
    name: `${ID} live (gated on GROWSURF_API_KEY)`,
    ignore: liveSkip("growsurf"),
    fn: async () => {
        const id = await liveProgramId();
        if (id === undefined) return; // the key's team has no programs
        // read a real participant id out of the roster rather than
        // inventing one: a miss here answers 400, which would be
        // indistinguishable from a genuine request fault
        const page = await runEndpoint({
            unit: await testSealedUnit("growsurf#campaign/{id}/participants"),
            input: { pathParams: { id }, queryParams: { limit: 1 } },
            mode: "live",
        });
        const first = ((page.output as { participants?: { id: string }[] })
            .participants ?? [])[0];
        if (first === undefined) return; // the program has no participants
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                pathParams: { id, participantIdOrEmail: first.id },
            },
            mode: "live",
        });
        assertLiveOk(result);
    },
});
