import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "letsfg#flights/discover";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const providerFixturesDir = fromFileUrl(
    new URL("../../fixtures/", import.meta.url),
);
const BODY = {
    origin: "LON",
    destinations: ["BCN", "LIS", "ROM"],
    date_from: "2026-12-10",
    currency: "EUR",
};

Deno.test(`${ID} happy (synthetic): the whole batch bills one search`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: BODY },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { PAGE: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} 401: missing key is data, zero usage`, async () => {
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
});

Deno.test(`${ID}: more than 20 destinations is refused before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        { maxItems?: number }
    >;
    assertEquals(properties.destinations.maxItems, 20);
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
                    destinations: ["BCN", "LIS"],
                    date_from: departure,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});
