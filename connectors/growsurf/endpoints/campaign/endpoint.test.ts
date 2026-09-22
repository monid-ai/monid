import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "growsurf#campaign/{id}";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: the commissionStructure is what prices a recorded sale`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-campaign-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "x4t7bd" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output projection on this doc: the vendor's body IS the contract,
    // so a dropped reward or an injected field must fail here
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} schema gate: an empty program id never reaches the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-campaign-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { id: "" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin: the gate is a non-empty bound, not a guess at the
    // id's shape — GrowSurf ids are opaque and we do not pattern-match them
    await assertInputAccepted({
        unit,
        input: { pathParams: { id: "anything-nonempty" } },
        mode: "replay",
        fixture,
    });
});

Deno.test(`${ID}: the program id is REQUIRED in the compiled doc`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.input.schema.pathParams?.required, ["id"]);
    assertEquals(
        unit.doc.request.url,
        "https://api.growsurf.com/v2/campaign/{id}",
    );
});
