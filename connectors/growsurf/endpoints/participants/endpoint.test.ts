import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

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
    assertEquals(result.usage, { credits: {}, evidence: {} });

    const body = result.output as Record<string, unknown>;
    assertEquals((body.participants as unknown[]).length, 2);
    // the paging contract: a non-null nextId means there is another page,
    // and it is a plain participant id the caller can send straight back
    assertEquals(body.nextId, "xua4sq");
    // shareUrl is the referral link — the field most callers came for
    const first = (body.participants as Record<string, unknown>[])[0];
    assertEquals(first.shareUrl, "https://piedpiper.com?grsf=gavin-f8g9nl");
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
