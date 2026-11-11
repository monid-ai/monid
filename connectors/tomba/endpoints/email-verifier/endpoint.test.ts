import { assertEquals } from "@std/assert";
import { liveSkip } from "@shared/testing";
import { TOMBA_KEYS } from "../../schema/auth.ts";
import {
    assertGate,
    assertLive,
    assertProviderError,
    estimate,
    INPUTS,
    replay,
} from "../../test-data.ts";

const ID = "tomba#email-verifier";

Deno.test(`${ID} happy (synthetic): a valid verdict — 1 verification credit`, async () => {
    const { result, fixture } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { verification: 1 },
        evidence: { verification: 1, phones: 0 },
    });
    // the whole vendor body relays untouched — no billing field stripped
    // or added, the result count is the fixture's
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} phone data (synthetic): 1 verification + 2 × 5 search credits`, async () => {
    const { result } = await replay(ID, "phones");
    assertEquals(result.usage, {
        credits: { verification: 1, search: 10 },
        evidence: { verification: 1, phones: 2 },
    });
});

Deno.test(`${ID} a disposable verdict: free`, async () => {
    const { result } = await replay(ID, "miss");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { verification: 0, phones: 0 },
    });
});

Deno.test(`${ID} estimate: one verdict, one phone number with enrich_mobile`, async () => {
    assertEquals(await estimate(ID, INPUTS[ID].happy), {
        credits: { verification: 1 },
        evidence: { verification: 1, phones: 0 },
    });
    assertEquals(await estimate(ID, INPUTS[ID].phones), {
        credits: { verification: 1, search: 5 },
        evidence: { verification: 1, phones: 1 },
    });
});

Deno.test(`${ID}: the schema gate — one email`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { email: "jane.doe" } },
        { queryParams: { email: "jane.doe@stripe.com", full: true } },
    ], [
        { queryParams: { email: "john.roe@stripe.com", enrich_mobile: true } },
    ]));

Deno.test(`${ID} provider error (synthetic 401): zero usage, the errors envelope digested`, () =>
    assertProviderError(ID));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
