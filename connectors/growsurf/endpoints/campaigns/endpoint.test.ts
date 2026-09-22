import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "growsurf#campaigns";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: the list is the entry point, and it is free`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-campaigns-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // FREE model: nothing folds, nothing is evidenced
    assertEquals(result.usage, { credits: {}, evidence: {} });

    const campaigns = (result.output as Record<string, unknown>)
        .campaigns as Record<
            string,
            unknown
        >[];
    assertEquals(campaigns.length, 2);
    // the two program TYPES decide which of the other endpoints apply, so
    // both must survive to the caller untouched
    assertEquals(campaigns.map((c) => c.type), ["REFERRAL", "AFFILIATE"]);
});

Deno.test(`${ID}: no input schema at all — the one endpoint needing no id`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.input.schema.pathParams, undefined);
    assertEquals(unit.doc.input.schema.queryParams, undefined);
    assertEquals(unit.doc.input.schema.body, undefined);
});

Deno.test(`${ID} provider error: a 403 is data, and still zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-provider-error.json`),
    });

    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // `code` is the stable half of GrowSurf's error envelope — it must
    // reach the caller intact
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "NOT_AUTHORIZED_ERROR",
    );
});

Deno.test({
    // The ONLY live test in this connector, because it is the only call
    // that needs no program id: every other endpoint would have to
    // hardcode an id that exists in one particular GrowSurf team.
    name: `${ID} live (gated on GROWSURF_API_KEY)`,
    ignore: liveSkip("growsurf"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({ unit, input: {}, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert(
            Array.isArray(
                (result.output as Record<string, unknown>).campaigns,
            ),
            "campaigns array present",
        );
    },
});
