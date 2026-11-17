import { assertEquals } from "@std/assert";
import { liveSkip } from "@shared/testing";
import { TOMBA_KEYS } from "../../schema/auth.ts";
import {
    assertGate,
    assertLive,
    assertProviderError,
    replay,
} from "../../test-data.ts";

const ID = "tomba#domain-suggestions";

Deno.test(`${ID} happy (synthetic): free`, async () => {
    const { result, fixture } = await replay(ID, "happy");
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the whole vendor body relays untouched — no billing field stripped
    // or added, the result count is the fixture's
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID}: the schema gate — a 1-100 character query`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { query: "" } },
        { queryParams: { query: "x".repeat(101) } },
    ], [
        { queryParams: { query: "adyen" } },
    ]));

Deno.test(`${ID} provider error (synthetic 401): zero usage, the errors envelope digested`, () =>
    assertProviderError(ID));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
