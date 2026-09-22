import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "growsurf#campaign/{id}/analytics";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: totals plus the derived rates`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-analytics-ok.json`);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { id: "k9j2mq" },
            queryParams: { days: 30, include: "rates" },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });

    const body = result.output as Record<string, unknown>;
    // the window is echoed back, so a caller can say what it actually
    // measured rather than what it asked for
    assertEquals(typeof body.startDate, "number");
    assertEquals(typeof body.endDate, "number");
    // `rates` arrives ONLY because include asked for it
    const rates = body.rates as Record<string, number>;
    assertEquals(rates.referralConversionRate, 0.2857);
});

Deno.test(`${ID} schema gate: days is bounded at the vendor's five years`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-analytics-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { id: "k9j2mq" },
                    queryParams: { days: 1826 },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin at the boundary: 1825 is the documented maximum
    await assertInputAccepted({
        unit,
        input: { pathParams: { id: "k9j2mq" }, queryParams: { days: 1825 } },
        mode: "replay",
        fixture,
    });
});

Deno.test(`${ID}: no schema default on the window, and a wider timeout than the provider's`, async () => {
    const unit = await testSealedUnit(ID);
    const props = (unit.doc.input.schema.queryParams?.properties ??
        {}) as unknown as Record<string, { default?: unknown } | undefined>;
    // the window is EITHER days OR startDate/endDate — a cross-field rule
    // that cannot survive z.toJSONSchema. Materializing the vendor's 365
    // default here would silently send `days` alongside an explicit date
    // pair and turn a valid request into a 400, so the mirror stays bare
    // and the rule lives in the descriptions and in meta.notes.
    assertEquals(props.days?.default, undefined);
    assertEquals(unit.doc.timeouts.requestMs, 60_000);
});
