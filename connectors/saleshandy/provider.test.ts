import { assertEquals } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const baseUrl = "https://open-api.saleshandy.com";
const searches: { path: string; body: Json }[] = [
    {
        path: "people",
        body: { job_title: { includes: ["Head of Sales"] }, page: 2 },
    },
    {
        path: "companies",
        body: { company_domain: { includes: ["example.com"] }, page: 1 },
    },
];

for (const { path, body } of searches) {
    const id = `saleshandy#search/${path}`;
    Deno.test(`${id} sends the documented search request and preserves an empty result`, async () => {
        const bundle = await testBundle();
        assertEquals(
            bundle.endpoints[id]?.request.url,
            `${baseUrl}/v1/search/${path}`,
        );

        const unit = await testSealedUnit(id);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-no-results.json`,
        );
        const result = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 201);
        assertEquals(result.isProviderError, false);
        assertEquals(result.output, { message: "Success", payload: [] });
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
}
