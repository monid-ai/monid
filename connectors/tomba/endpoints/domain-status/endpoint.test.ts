import { assertEquals } from "@std/assert";
import { liveSkip } from "@shared/testing";
import { TOMBA_KEYS } from "../../schema/auth.ts";
import { assertGate, assertLive, replay } from "../../test-data.ts";

const ID = "tomba#domain-status";

Deno.test(`${ID} happy (synthetic): free`, async () => {
    const { result } = await replay(ID, "happy");
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: the schema gate — domain or email`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { email: "not-an-email" } },
    ], [
        { queryParams: { email: "jane.doe@stripe.com" } },
        { queryParams: { domain: "https://www.mailinator.com" } },
    ]));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
