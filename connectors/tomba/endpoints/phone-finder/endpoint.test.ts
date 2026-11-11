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

const ID = "tomba#phone-finder";

Deno.test(`${ID} happy (synthetic): a valid number by email — 5 search credits`, async () => {
    const { result, fixture } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { search: 5 },
        evidence: { lookup: 1, domain_lookup: 0 },
    });
    // the whole vendor body relays untouched — no billing field stripped
    // or added, the result count is the fixture's
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} with domain (synthetic): a valid number — 1 search credit`, async () => {
    const { result } = await replay(ID, "domain");
    assertEquals(result.usage, {
        credits: { search: 1 },
        evidence: { lookup: 0, domain_lookup: 1 },
    });
});

Deno.test(`${ID} nothing found (200, data []): free`, async () => {
    const { result } = await replay(ID, "miss");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { lookup: 0, domain_lookup: 0 },
    });
});

Deno.test(`${ID} estimate: the input selects the price — 5, or 1 with domain`, async () => {
    assertEquals(await estimate(ID, INPUTS[ID].happy), {
        credits: { search: 5 },
        evidence: { lookup: 1, domain_lookup: 0 },
    });
    assertEquals(
        await estimate(ID, {
            queryParams: { email: "jane.doe@stripe.com", domain: "stripe.com" },
        }),
        { credits: { search: 1 }, evidence: { lookup: 0, domain_lookup: 1 } },
    );
});

Deno.test(`${ID}: the schema gate — at least one of email, domain, linkedin`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { full: true } },
        { queryParams: { email: "jane" } },
        { queryParams: { linkedin: "https://twitter.com/jane" } },
    ], [
        { queryParams: { linkedin: "https://www.linkedin.com/in/jane-doe" } },
        {
            queryParams: {
                email: "jane.doe@stripe.com",
                domain: "stripe.com",
                full: true,
            },
        },
    ]));

Deno.test(`${ID} provider error (synthetic 401): zero usage, the errors envelope digested`, () =>
    assertProviderError(ID));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
