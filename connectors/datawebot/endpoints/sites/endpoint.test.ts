import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "datawebot#sites";

const run = async (fixture: string, queryParams: Record<string, string>) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { queryParams },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("datawebot#sites: free, returns the shop's capabilities", async () => {
    const result = await run("synthetic-sites.json", { site: "walmart.com" });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals(output.search.available, true);
});

Deno.test("datawebot#sites 401 is data, zero usage", async () => {
    const result = await run("synthetic-sites-error.json", {
        site: "walmart.com",
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("datawebot#sites three-letter country fails INVALID_INPUT before the wire", async () => {
    await assertRejects(
        () =>
            run("synthetic-sites-us.json", {
                site: "walmart.com",
                country: "USA",
            }),
        Error,
        "INVALID_INPUT",
    );
    const twin = await run("synthetic-sites-us.json", {
        site: "walmart.com",
        country: "US",
    });
    assertEquals(twin.httpStatus, 200);
});

Deno.test({
    name: "datawebot#sites live (gated on DATAWEBOT_API_KEY)",
    ignore: liveSkip("datawebot"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { queryParams: { site: "walmart.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<
            string,
            Record<string, unknown>
        >;
        assertEquals(typeof output.site, "string");
        assertEquals(typeof output.search.available, "boolean");
        assertEquals(typeof output.product.available, "boolean");
    },
});
