import { assertEquals } from "@std/assert";
import { liveSkip } from "@shared/testing";
import { TOMBA_KEYS } from "../../schema/auth.ts";
import { assertGate, assertLive, estimate, replay } from "../../test-data.ts";

const ID = "tomba#similar";

Deno.test(`${ID} happy (synthetic): results on limit 10 — 1 search credit`, async () => {
    const { result } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { search: 1 },
        evidence: { RESULT: 10 },
    });
});

Deno.test(`${ID} estimate: the requested limit is the cost basis — limit 50 → 5`, async () => {
    assertEquals(
        await estimate(ID, {
            queryParams: { domain: "stripe.com", limit: 50 },
        }),
        { credits: { search: 5 }, evidence: { RESULT: 50 } },
    );
});

Deno.test(`${ID} no similar companies (data null): free`, async () => {
    const { result } = await replay(ID, "miss");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID}: the schema gate — domain|company and a stated limit`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { domain: "stripe.com" } },
        { queryParams: { domain: "stripe.com", limit: 25 } },
        { queryParams: { company: "St", limit: 10 } },
    ], [
        { queryParams: { company: "Stripe", limit: 10 } },
        { queryParams: { domain: "stripe.com", limit: 250, page: 2 } },
    ]));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
