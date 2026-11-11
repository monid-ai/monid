import { assertEquals } from "@std/assert";
import { liveSkip } from "@shared/testing";
import { TOMBA_KEYS } from "../../schema/auth.ts";
import {
    assertGate,
    assertLive,
    estimate,
    INPUTS,
    replay,
} from "../../test-data.ts";

const ID = "tomba#linkedin";

Deno.test(`${ID} happy (synthetic): an address found — 1 search credit`, async () => {
    const { result } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { search: 1 },
        evidence: { lookup: 1, phones: 0 },
    });
});

Deno.test(`${ID} full=true (synthetic): two stored addresses — 2 search credits`, async () => {
    const { result } = await replay(ID, "full");
    assertEquals(result.usage, {
        credits: { search: 2 },
        evidence: { lookup: 2, phones: 0 },
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

Deno.test(`${ID} estimate: 1 (6 with enrich_mobile); full=true → up to 2`, async () => {
    assertEquals(await estimate(ID, INPUTS[ID].happy), {
        credits: { search: 1 },
        evidence: { lookup: 1, phones: 0 },
    });
    assertEquals(
        await estimate(ID, {
            queryParams: {
                url: "https://www.linkedin.com/in/jane-doe",
                enrich_mobile: true,
            },
        }),
        { credits: { search: 6 }, evidence: { lookup: 1, phones: 1 } },
    );
    assertEquals(await estimate(ID, INPUTS[ID].full), {
        credits: { search: 2 },
        evidence: { lookup: 2, phones: 0 },
    });
});

Deno.test(`${ID}: the schema gate — a linkedin.com url`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { url: "https://twitter.com/janedoe" } },
        { queryParams: { url: "https://www.linkedin.com/in/x", full: "yes" } },
    ], [
        {
            queryParams: {
                url: "https://www.linkedin.com/in/jane-doe",
                enrich_mobile: true,
            },
        },
    ]));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
