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
    const fixture = await loadFixture(`${chains}synthetic-campaigns-ok.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // FREE model: nothing folds, nothing is evidenced
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output projection on this doc: the vendor's body IS the contract.
    // Comparing the WHOLE body (not picked fields) is what catches a
    // stripped program or an injected billing field.
    assertEquals(result.output, fixture.calls[0].res.body);

    // the two program TYPES decide which of the other endpoints apply
    const campaigns = (result.output as Record<string, unknown>)
        .campaigns as Record<string, unknown>[];
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
    const fixture = await loadFixture(`${chains}synthetic-provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 403);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the envelope reaches the caller intact — `code` is the stable half
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test({
    // The one live test that needs NOTHING but a key. Every other endpoint
    // needs a program id, which belongs to one GrowSurf team — see those
    // suites, which discover an id through this endpoint rather than
    // pinning one that exists only in our own account.
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
