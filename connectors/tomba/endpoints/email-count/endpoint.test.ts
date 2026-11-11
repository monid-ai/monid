import { assertEquals } from "@std/assert";
import { liveSkip } from "@shared/testing";
import { TOMBA_KEYS } from "../../schema/auth.ts";
import { assertGate, assertLive, replay } from "../../test-data.ts";

const ID = "tomba#email-count";

Deno.test(`${ID} happy (synthetic): every successful call — 1 email count credit`, async () => {
    const { result } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { email_count: 1 },
        evidence: { CALL: 1 },
    });
});

Deno.test(`${ID}: the schema gate — one bare domain`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { domain: "https://stripe.com/about" } },
        { queryParams: { domain: "stripe.com", type: "role" } },
        { queryParams: { domain: "stripe.com", company: "Stripe" } },
    ], [
        { queryParams: { domain: "stripe.com", type: "personal" } },
    ]));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
