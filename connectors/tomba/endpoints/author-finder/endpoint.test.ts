import { assertEquals } from "@std/assert";
import { liveSkip } from "@shared/testing";
import { TOMBA_KEYS } from "../../schema/auth.ts";
import {
    assertGate,
    assertLive,
    assertProviderError,
    replay,
} from "../../test-data.ts";

const ID = "tomba#author-finder";

Deno.test(`${ID} happy (synthetic): the author's address — 1 search credit`, async () => {
    const { result, fixture } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { search: 1 },
        evidence: { RESULT: 1 },
    });
    // the whole vendor body relays untouched — no billing field stripped
    // or added, the result count is the fixture's
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} no author address (200, email null): free`, async () => {
    const { result } = await replay(ID, "miss");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID}: the schema gate — one article url`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { url: "" } },
        {
            queryParams: {
                url: "https://stripe.com/blog",
                enrich_mobile: true,
            },
        },
    ], [
        { queryParams: { url: "stripe.com/blog/another-post" } },
    ]));

Deno.test(`${ID} provider error (synthetic 401): zero usage, the errors envelope digested`, () =>
    assertProviderError(ID));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
