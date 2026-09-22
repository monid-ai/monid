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

const ID = "growsurf#campaign/{id}/participants";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: a page carries the cursor for the next one`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-participants-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "k9j2mq" }, queryParams: { limit: 2 } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);

    const body = result.output as Record<string, unknown>;
    // the paging contract: a non-null nextId means there is another page,
    // and it is a plain participant id the caller can send straight back
    assertEquals(body.nextId, "xua4sq");
    // shareUrl is the referral link — the field most callers came for
    const first = (body.participants as Record<string, unknown>[])[0];
    assertEquals(first.shareUrl, "https://piedpiper.com?grsf=gavin-f8g9nl");
});

Deno.test(`${ID} provider error: a 429 is data, and carries its own retry advice`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-error-participants.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "k9j2mq" }, queryParams: { limit: 2 } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} schema gate: limit is bounded at the vendor's 100`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-participants-ok.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { id: "k9j2mq" },
                    queryParams: { limit: 101 },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin at the boundary itself: 100 passes, so the gate is
    // the vendor's documented maximum and not a narrower guess
    await assertInputAccepted({
        unit,
        input: { pathParams: { id: "k9j2mq" }, queryParams: { limit: 100 } },
        mode: "replay",
        fixture,
    });
});

Deno.test(`${ID}: paging knobs are OPTIONAL — a bare first page needs only the id`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.input.schema.queryParams?.required, undefined);
    assertEquals(unit.doc.input.schema.pathParams?.required, ["id"]);
    // the deepObject metadata filter is deliberately NOT mirrored: a query
    // string has no nesting for the engine to encode (see the proposal)
    const props = Object.keys(
        (unit.doc.input.schema.queryParams?.properties ?? {}) as Record<
            string,
            unknown
        >,
    );
    assertEquals(props, ["nextId", "limit"]);
});

Deno.test({
    name: `${ID} live (gated on GROWSURF_API_KEY)`,
    ignore: liveSkip("growsurf"),
    fn: async () => {
        const id = await liveProgramId();
        if (id === undefined) return; // the key's team has no programs
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { pathParams: { id }, queryParams: { limit: 1 } },
            mode: "live",
        });
        assertLiveOk(result);
    },
});
