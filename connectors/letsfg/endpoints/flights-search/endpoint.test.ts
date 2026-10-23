import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "letsfg#flights/search";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const providerFixturesDir = fromFileUrl(
    new URL("../../fixtures/", import.meta.url),
);
const BODY = {
    origin: "LON",
    destination: "BCN",
    date_from: "2026-12-10",
    currency: "EUR",
    limit: 2,
};

Deno.test(`${ID} happy (synthetic): a search with offers bills one search`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: BODY },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { PAGE: 1 },
    });
    // no consolidate and no fromResponse: the payload passes through whole
    assertEquals(result.output, fixture.calls[0].res.body);
    const offers = (result.output as { offers: { booking_url: string }[] })
        .offers;
    assertEquals(offers.length, 2);
    assertEquals(offers[0].booking_url.startsWith("https://letsfg.co/"), true);
});

Deno.test(`${ID} empty (synthetic): no offers, nothing billed`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                origin: "LON",
                destination: "BCN",
                date_from: "2026-12-10",
                cabin_class: "F",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { PAGE: 0 } });
});

Deno.test(`${ID} 401: missing key is data, zero usage, message lifted`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${providerFixturesDir}unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: BODY },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message: "API key is required.",
        raw: fixture.calls[0].res.body,
    });
});

Deno.test(`${ID} 402 (synthetic): allowance exhausted keeps its code`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${providerFixturesDir}synthetic-allowance-exhausted.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: BODY },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message:
            "You have used 200 searches since your last booking, past the 200 that come free with one.",
        code: "search_allowance_exhausted",
        raw: fixture.calls[0].res.body,
    });
});

Deno.test(`${ID} 502 (synthetic): an HTML edge page still settles as an error`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${providerFixturesDir}unauthorized.json`,
    );
    // letsfg.co sits behind Cloudflare; its 5xx pages are HTML, not JSON
    fixture.calls[0].res.status = 502;
    fixture.calls[0].res.body = "<html><body>Bad gateway</body></html>";
    const result = await runEndpoint({
        unit,
        input: { body: BODY },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 502);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message: "LetsFG API error",
        raw: "<html><body>Bad gateway</body></html>",
    });
});

Deno.test(`${ID}: cabin is an enum and provider_filters is not exposed`, async () => {
    const unit = await testSealedUnit(ID);
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        { enum?: unknown[] }
    >;
    assertEquals(properties.cabin_class.enum, ["M", "W", "C", "F"]);
    assertEquals("provider_filters" in properties, false);
});

Deno.test({
    name: `${ID} live (gated on LETSFG_CREDENTIALS_API_KEY)`,
    ignore: liveSkip("letsfg"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const departure = new Date(Date.now() + 30 * 86_400_000)
            .toISOString().slice(0, 10);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    origin: "LON",
                    destination: "BCN",
                    date_from: departure,
                    limit: 3,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const offers = (result.output as { offers: unknown[] }).offers;
        assertEquals(result.usage.evidence, {
            PAGE: offers.length > 0 ? 1 : 0,
        });
    },
});
