import { assertEquals } from "@std/assert";
import { liveSkip } from "@shared/testing";
import { TOMBA_KEYS } from "../../schema/auth.ts";
import { assertGate, assertLive, replay } from "../../test-data.ts";

const ID = "tomba#reveal/search";

Deno.test(`${ID} happy (synthetic): companies returned — 1 search credit`, async () => {
    const { result } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { search: 1 },
        evidence: { PAGE: 1 },
    });
});

Deno.test(`${ID} no company matches: free`, async () => {
    const { result } = await replay(ID, "miss");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { PAGE: 0 } });
});

Deno.test(`${ID}: the schema gate — query or filters, the vendor bounds`, () =>
    assertGate(ID, [
        { body: {} },
        { body: { page: 1 } },
        { body: { query: "short" } },
        { body: { query: "Real estate agencies in Europe", page: 1001 } },
        { body: { filters: { headcount: { include: ["50"] } } } },
        { body: { filters: { industry: { include: ["x"], other: [] } } } },
    ], [
        { body: { query: "Real estate agencies in Europe" } },
        {
            body: {
                filters: {
                    size: { include: ["5K-10K"] },
                    revenue: { exclude: ["0-1m"] },
                },
                page: 2,
            },
        },
    ]));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
