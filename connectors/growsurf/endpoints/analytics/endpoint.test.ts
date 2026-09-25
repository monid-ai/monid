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

const ID = "growsurf#campaign/{id}/analytics";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    pathParams: { id: "k9j2mq" },
    queryParams: { days: 30, include: "rates" },
};

Deno.test(`${ID} happy: totals plus the derived rates`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-analytics-ok.json`);
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

    const body = result.output as Record<string, unknown>;
    // the window is echoed back, so a caller can say what it actually
    // measured rather than what it asked for
    assertEquals(typeof body.startDate, "number");
    assertEquals(typeof body.endDate, "number");
    // `rates` arrives ONLY because include asked for it
    const rates = body.rates as Record<string, number>;
    assertEquals(rates.referralConversionRate, 0.2857);
});

Deno.test(`${ID} provider error: the referral plan gate is an ACCOUNT state`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-error-analytics.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 403);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
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

Deno.test({
    name: `${ID} live (gated on GROWSURF_API_KEY)`,
    ignore: liveSkip("growsurf"),
    fn: async () => {
        const id = await liveProgramId();
        if (id === undefined) return; // the key's team has no programs
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { pathParams: { id }, queryParams: { days: 30 } },
            mode: "live",
        });
        assertLiveOk(result);
    },
});
