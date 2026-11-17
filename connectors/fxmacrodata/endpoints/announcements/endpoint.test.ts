import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "fxmacrodata#v1/announcements/{currency}/{indicator}";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    pathParams: { currency: "USD", indicator: "inflation" },
    queryParams: { limit: 2, fields: "compact" },
};

Deno.test(`${ID} happy (recorded, keyless USD): compact page, free-tier window disclosed`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${FIXTURES}announcements-usd-inflation-ok.json`,
    );
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

    const output = result.output as Record<string, Json>;
    assertEquals(output.indicator, "inflation");
    const rows = output.data as Record<string, Json>[];
    assertEquals(rows.length, 2);
    // compact rows: value, previous, change, timing, revision summary
    assertEquals(Object.keys(rows[0]).sort(), [
        "announcement_datetime",
        "announcement_datetime_local",
        "change_from_previous",
        "date",
        "previous_value",
        "publication_time_status",
        "revisions_summary",
        "val",
    ]);
    const pagination = output.pagination as Record<string, Json>;
    assertEquals(pagination.has_more, true);
    const window = output.freemium_window as Record<string, Json>;
    assertEquals(window.max_days, 90);
});

Deno.test(`${ID}: path params required; bounds and vocabularies enforced`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${FIXTURES}announcements-usd-inflation-ok.json`,
    );
    const path = INPUT.pathParams;
    const rejected: RunInput[] = [
        {},
        { pathParams: { currency: "USD" } },
        { pathParams: { ...path, currency: "XYZ" } },
        { pathParams: path, queryParams: { limit: 0 } },
        { pathParams: path, queryParams: { limit: 101 } },
        { pathParams: path, queryParams: { offset: -1 } },
        { pathParams: path, queryParams: { page: 0 } },
        { pathParams: path, queryParams: { fields: "minimal" } },
        { pathParams: path, queryParams: { frequency: "annual" } },
        { pathParams: path, queryParams: { revisions: "second" } },
        { pathParams: path, queryParams: { availability: "known" } },
        { pathParams: path, queryParams: { bogus: 1 } },
    ];
    for (const input of rejected) {
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(input),
        );
    }
});

Deno.test({
    name: `${ID} live (gated on FXMACRODATA_API_KEY)`,
    ignore: liveSkip("fxmacrodata"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                pathParams: { currency: "EUR", indicator: "inflation" },
                queryParams: { limit: 3 },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, Json>;
        assertEquals(output.currency, "EUR");
        assertEquals((output.data as Json[]).length, 3);
    },
});
