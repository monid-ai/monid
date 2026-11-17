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

const ID = "tomba#domain-search";

Deno.test(`${ID} happy (synthetic): two addresses on a limit-10 page — 1 search credit`, async () => {
    const { result, fixture } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { search: 1 },
        evidence: { results: 10, phones: 0 },
    });
    // the whole vendor body relays untouched — no billing field stripped
    // or added, the result count is the fixture's
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} phone data (synthetic): limit 20 + one address with phones — 2 + 5 = 7`, async () => {
    const { result } = await replay(ID, "phones");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { search: 7 },
        evidence: { results: 20, phones: 1 },
    });
});

Deno.test(`${ID} a webmail domain (200, empty emails): free`, async () => {
    const { result } = await replay(ID, "miss");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { results: 0, phones: 0 },
    });
});

Deno.test(`${ID} estimate: the full requested page, phones on every address with enrich_mobile`, async () => {
    assertEquals(
        await estimate(ID, {
            queryParams: { domain: "stripe.com", limit: 50 },
        }),
        { credits: { search: 5 }, evidence: { results: 50, phones: 0 } },
    );
    assertEquals(
        await estimate(ID, {
            queryParams: {
                domain: "stripe.com",
                limit: 10,
                enrich_mobile: true,
            },
        }),
        { credits: { search: 51 }, evidence: { results: 10, phones: 10 } },
    );
});

Deno.test(`${ID}: the schema gate — domain|company, a stated limit, the vendor enums`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { domain: "stripe.com" } },
        { queryParams: { limit: 10 } },
        { queryParams: { domain: "stripe.com", limit: 15 } },
        { queryParams: { domain: "https://stripe.com", limit: 10 } },
        { queryParams: { company: "St", limit: 10 } },
        { queryParams: { domain: "stripe.com", limit: 10, type: "role" } },
        { queryParams: { domain: "stripe.com", limit: 10, country: "USA" } },
        {
            queryParams: {
                domain: "stripe.com",
                limit: 10,
                webhook_url: "https://example.com/hook",
            },
        },
    ], [
        { queryParams: { company: "Stripe", limit: 50 } },
        {
            queryParams: {
                domain: "stripe.com",
                limit: 5000,
                page: 2,
                department: "engineering,sales",
                type: "personal",
                country: "US",
                enrich_mobile: true,
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
