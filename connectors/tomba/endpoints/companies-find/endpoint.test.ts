import { assertEquals } from "@std/assert";
import { liveSkip } from "@shared/testing";
import { TOMBA_KEYS } from "../../schema/auth.ts";
import { assertGate, assertLive, replay } from "../../test-data.ts";

const ID = "tomba#companies/find";

Deno.test(`${ID} happy (synthetic): a company found — 1 search credit`, async () => {
    const { result } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { search: 1 },
        evidence: { RESULT: 1 },
    });
});

Deno.test(`${ID} no match (200 carrying errors.not_found): free, not a provider error`, async () => {
    const { result, fixture } = await replay(ID, "miss");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID}: the schema gate — one domain`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { domain: "https://stripe.com" } },
        {
            queryParams: {
                domain: "stripe.com",
                webhook_url: "https://example.com/h",
            },
        },
    ], [
        { queryParams: { domain: "adyen.com" } },
    ]));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
