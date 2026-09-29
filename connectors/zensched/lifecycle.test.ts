import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));

const ENDPOINTS = [
    "zensched#guide",
    "zensched#account-create",
    "zensched#feedback-submit",
] as const;

const INPUTS = {
    "zensched#guide": { body: {} },
    "zensched#account-create": { body: { org_name: "Demo Field Crew" } },
    "zensched#feedback-submit": {
        body: {
            title: "Surface pet-care kits in Monid discover",
            body: "Would love Monid discover to surface pet-care reference-design kits.",
            category: "feature",
        },
    },
} as const;

Deno.test("zensched: HTTP 200 + result.isError becomes 502 and bills nothing", async () => {
    const fixture = await loadFixture(`${FIXTURES}synthetic-envelope-error.json`);
    for (const id of ENDPOINTS) {
        const unit = await testSealedUnit(id);
        const result = await runEndpoint({
            unit,
            input: INPUTS[id],
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 502, id);
        assertEquals(result.providerHttpStatus, 200, id);
        assertEquals(result.isProviderError, true, id);
        assertEquals(result.usage, { credits: {}, evidence: {} }, id);
    }
});

Deno.test("zensched: HTTP 200 + json-rpc error becomes 502 and bills nothing", async () => {
    const fixture = await loadFixture(`${FIXTURES}synthetic-jsonrpc-error.json`);
    for (const id of ENDPOINTS) {
        const unit = await testSealedUnit(id);
        const result = await runEndpoint({
            unit,
            input: INPUTS[id],
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 502, id);
        assertEquals(result.isProviderError, true, id);
        assertEquals(result.usage, { credits: {}, evidence: {} }, id);
    }
});
