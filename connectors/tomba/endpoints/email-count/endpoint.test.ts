import { assertEquals } from "@std/assert";
import { liveSkip } from "@shared/testing";
import { TOMBA_KEYS } from "../../schema/auth.ts";
import {
    assertGate,
    assertLive,
    assertProviderError,
    replay,
} from "../../test-data.ts";

const ID = "tomba#email-count";

Deno.test(`${ID} happy (synthetic): every successful call — 1 email count credit`, async () => {
    const { result, fixture } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { email_count: 1 },
        evidence: { CALL: 1 },
    });
    // the whole vendor body relays untouched — no billing field stripped
    // or added, the result count is the fixture's
    assertEquals(result.output, fixture.calls[0].res.body);
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

Deno.test(`${ID} provider error (synthetic 401): zero usage, the errors envelope digested`, () =>
    assertProviderError(ID));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
