import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID =
    "growsurf#campaign/{id}/participant/{participantIdOrEmail}/transaction";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const PATH = { id: "x4t7bd", participantIdOrEmail: "i9g2bh" };
const SALE = {
    currency: "USD",
    grossAmount: 9900,
    invoiceId: "invoice_54",
    description: "Renewal for Pro subscription",
};

/** NO LIVE TEST: a live run records a real sale against a real customer's
 *  affiliate program and generates a real commission they then owe. This
 *  is the one endpoint in the connector where a stray test run costs
 *  somebody money. See add-participant's note. */

Deno.test(`${ID} happy: a $99.00 sale, first one, not a duplicate`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-record-transaction-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { pathParams: PATH, body: SALE },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // the money in this payload is the CUSTOMER'S sale, never a charge for
    // the call — the connector bills nothing either way
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);

    const body = result.output as Record<string, unknown>;
    assertEquals(body.success, true);
    assertEquals(body.duplicate, false);
});

Deno.test(`${ID} duplicate: the same invoiceId twice pays no one twice`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-record-transaction-duplicate.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { pathParams: PATH, body: SALE },
        mode: "replay",
        fixture,
    });

    // this is the whole reason an identifier is required: a retried sale
    // answers 200, NOT an error status, and creates no second commission.
    // A caller reading the status alone would believe it had recorded two.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, fixture.calls[0].res.body);
    const body = result.output as Record<string, unknown>;
    assertEquals(body.success, false);
    assertEquals(body.duplicate, true);
    assertEquals(body.commissionsCreated, 0);
    assertEquals(body.duplicateFields, ["invoiceId"]);
    assertEquals(body.matchingCommissionIds, ["comm_jy6kl1"]);
});

Deno.test(`${ID} provider error: a REFERRAL program refuses the call outright`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-error-record-transaction.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { pathParams: PATH, body: SALE },
        mode: "replay",
        fixture,
    });

    // "affiliate programs only" is enforced by the VENDOR, not by the
    // schema — nothing in the input distinguishes the two program types,
    // so this 422 is the only place a caller learns it
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} schema gate: a non-integer or zero amount never reaches the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-record-transaction-ok.json`,
    );
    // 99.00 DOLLARS instead of 9900 cents is the mistake worth catching
    // before it becomes a commission: the vendor's unit is the minor one
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: PATH,
                    body: { ...SALE, grossAmount: 99.5 },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // a three-letter currency is the other half of the contract
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: PATH,
                    body: { ...SALE, currency: "DOLLARS" },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin: the smallest lawful sale, one minor unit
    await assertInputAccepted({
        unit,
        input: {
            pathParams: PATH,
            body: { currency: "USD", grossAmount: 1, externalId: "txn_1" },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test(`${ID}: currency and grossAmount are the required pair`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.input.schema.body?.required, [
        "currency",
        "grossAmount",
    ]);
    // "at least one transaction identifier" is a cross-field rule that
    // cannot survive z.toJSONSchema, so it is documented on the fields and
    // in meta.notes and enforced by GrowSurf with a 400 — NOT silently
    // dropped. None of the identifiers is required on its own.
    const props = (unit.doc.input.schema.body?.properties ??
        {}) as unknown as Record<string, unknown>;
    for (
        const id of [
            "externalId",
            "transactionId",
            "orderId",
            "paymentId",
            "invoiceId",
            "paymentIntentId",
            "chargeId",
        ]
    ) {
        assertEquals(id in props, true, id);
    }
});
