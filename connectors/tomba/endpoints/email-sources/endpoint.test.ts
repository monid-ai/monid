import { assertEquals } from "@std/assert";
import { liveSkip } from "@shared/testing";
import { TOMBA_KEYS } from "../../schema/auth.ts";
import { assertGate, assertLive, replay } from "../../test-data.ts";

const ID = "tomba#email-sources";

Deno.test(`${ID} happy (synthetic): sources found — 1 sources credit`, async () => {
    const { result } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { sources: 1 },
        evidence: { RESULT: 1 },
    });
});

Deno.test(`${ID} no sources (201, data []): free, not a provider error`, async () => {
    const { result } = await replay(ID, "miss");
    assertEquals(result.httpStatus, 201);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID}: the schema gate — one email`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { email: "stripe.com" } },
    ], [
        { queryParams: { email: "john.smith@stripe.com" } },
    ]));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
