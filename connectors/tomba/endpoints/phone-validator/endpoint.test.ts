import { assertEquals } from "@std/assert";
import { liveSkip } from "@shared/testing";
import { TOMBA_KEYS } from "../../schema/auth.ts";
import { assertGate, assertLive, replay } from "../../test-data.ts";

const ID = "tomba#phone-validator";

Deno.test(`${ID} happy (synthetic): a valid number — 1 search credit`, async () => {
    const { result } = await replay(ID, "happy");
    assertEquals(result.usage, {
        credits: { search: 1 },
        evidence: { CALL: 1 },
    });
});

Deno.test(`${ID} a number that isn't valid (200, data []): still 1 search credit`, async () => {
    const { result } = await replay(ID, "miss");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { search: 1 },
        evidence: { CALL: 1 },
    });
});

Deno.test(`${ID}: the schema gate — one phone, an alpha-2 country`, () =>
    assertGate(ID, [
        { queryParams: {} },
        { queryParams: { phone: "" } },
        { queryParams: { phone: "4155550132", country_code: "USA" } },
    ], [
        { queryParams: { phone: "4155550132", country_code: "US" } },
    ]));

Deno.test({
    name: `${ID} live (gated on TOMBA_CREDENTIALS_API_KEY + _SECRET_KEY)`,
    ignore: liveSkip("tomba", TOMBA_KEYS),
    fn: () => assertLive(ID),
});
