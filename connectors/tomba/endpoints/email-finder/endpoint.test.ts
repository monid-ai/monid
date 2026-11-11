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

const ID = "tomba#email-finder";

Deno.test(`${ID} happy (synthetic): an address found, status valid — 1 search credit`, async () => {
    const { result, fixture } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { search: 1 },
        evidence: { lookup: 1, phones: 0 },
    });
    // the whole vendor body relays untouched — no billing field stripped
    // or added, the result count is the fixture's
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} phone data (synthetic): 1 + 5 = 6 search credits`, async () => {
    const { result } = await replay(ID, "phones");
    assertEquals(result.usage, {
        credits: { search: 6 },
        evidence: { lookup: 1, phones: 1 },
    });
});

Deno.test(`${ID} a miss (200, email null): free`, async () => {
    const { result } = await replay(ID, "miss");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { lookup: 0, phones: 0 },
    });
});

Deno.test(`${ID} an address with status unknown: free`, async () => {
    const { result } = await replay(ID, "unknown");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: {},
        evidence: { lookup: 0, phones: 0 },
    });
});

Deno.test(`${ID} estimate: 1, or 6 with enrich_mobile`, async () => {
    assertEquals(await estimate(ID, INPUTS[ID].happy), {
        credits: { search: 1 },
        evidence: { lookup: 1, phones: 0 },
    });
    assertEquals(await estimate(ID, INPUTS[ID].phones), {
        credits: { search: 6 },
        evidence: { lookup: 1, phones: 1 },
    });
});

Deno.test(`${ID}: the schema gate — a company AND a person`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { first_name: "Jane", last_name: "Doe" } },
        { queryParams: { domain: "stripe.com", first_name: "Jane" } },
        { queryParams: { domain: "stripe.com" } },
        { queryParams: { domain: "stripe.com", full_name: "Jan" } },
        {
            queryParams: {
                domain: "stripe.com",
                full_name: "Jane Doe",
                linkedin: "x",
            },
        },
    ], [
        { queryParams: { company: "Stripe", full_name: "Jane Doe" } },
        {
            queryParams: {
                company: "Stripe",
                first_name: "Jane",
                last_name: "Doe",
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
