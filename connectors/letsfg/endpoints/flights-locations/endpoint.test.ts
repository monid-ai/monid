import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const ID = "letsfg#flights/locations";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID}: the {query} path param lands in the compiled url`, async () => {
    const bundle = await testBundle();
    assertEquals(
        bundle.endpoints[ID].request.url,
        "https://letsfg.co/developers/api/v1/flights/locations/{query}",
    );
});

Deno.test(`${ID} happy (synthetic): free, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { query: "London" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test({
    name: `${ID} live (gated on LETSFG_CREDENTIALS_API_KEY)`,
    ignore: liveSkip("letsfg"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { pathParams: { query: "London" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const rows = (result.output as { results: { iata: string }[] })
            .results;
        assertEquals(rows.some((row) => row.iata === "LON"), true);
    },
});
