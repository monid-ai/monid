import { assert, assertEquals } from "@std/assert";
import { type Json } from "@shared/core";
import { assertInputAccepted, liveSkip, testSealedUnit } from "@shared/testing";
import { harness, OWNED } from "../../test-support.ts";

/**
 * `voygr#me`. SYNTHETIC: a real `/users/me` holds the partner's account
 * details. The fixture is written to match the public OpenAPI response:
 * with a sub-account named, `max_concurrent_calls` and `max_calls_per_day`
 * are the limits that apply to it; everything else is still the partner
 * key's own view. Every value is made up.
 */

const ID = "voygr#me";
const h = harness(ID, import.meta.url);

/** Every field of the answer that describes the partner account, not the
 *  sub-account, and `credits_hold_per_call`: what VOYGR holds per call,
 *  not what Monid holds. */
const PARTNER_FIELDS = [
    "credits_hold_per_call",
    "api_key_id",
    "customer_id",
    "customer_name",
    "api_key_last_4",
    "status",
    "quota_limit",
    "current_usage",
    "anchored",
    "quota_period",
    "ask_user_webhook_url",
    "ask_user_webhook_configured",
    "webhook_events",
    "max_concurrent_calls_ceiling",
    "credits_available",
    "credits_held",
    "is_admin",
];

type Me = Record<string, Json>;

Deno.test("me shows the sub-account's own caps", async () => {
    const result = await h.run("synthetic-sub-account", {});
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        max_concurrent_calls: 2,
        max_calls_per_day: 30,
        credits_charge_per_successful_call: 10,
        maintenance: null,
    });
});

Deno.test("me drops partner fields", async () => {
    const raw = await h.recorded("synthetic-sub-account") as Me;
    // the fixture really carries every one of them
    for (const key of PARTNER_FIELDS) assert(key in raw, `fixture: ${key}`);
    const result = await h.run("synthetic-sub-account", {});
    const out = result.output as Me;
    for (const key of PARTNER_FIELDS) {
        assert(!(key in out), `${key} must not be in the output`);
    }
    // and none of their values leaks under another name
    const text = JSON.stringify(out);
    for (
        const secret of [
            "Synthetic Partner Ltd",
            "key_synthetic-0001",
            "cus_synthetic-0001",
            "hooks.example.com",
        ]
    ) {
        assert(!text.includes(secret), secret);
    }
});

Deno.test("me drops a partner field VOYGR adds later", async () => {
    const raw = await h.recorded("synthetic-sub-account") as Me;
    const { loaded } = await h.wire(200, {
        ...raw,
        billing_contact_email: "synthetic@example.com",
        partner_plan: "synthetic",
    });
    const result = await loaded.run({});
    assertEquals(Object.keys(result.output as Me).sort(), [
        "credits_charge_per_successful_call",
        "maintenance",
        "max_calls_per_day",
        "max_concurrent_calls",
    ]);
});

Deno.test("me passes a maintenance window through", async () => {
    const raw = await h.recorded("synthetic-sub-account") as Me;
    const window = {
        starts_at: "2026-11-01T02:00:00Z",
        message: "Planned maintenance.",
    };
    const { loaded } = await h.wire(200, { ...raw, maintenance: window });
    const result = await loaded.run({});
    assertEquals((result.output as Me).maintenance, window);
});

Deno.test("me passes an error through and strips customer_id from it", async () => {
    // `me` replaces fromResponse only: the provider's fromError still runs
    const refusal = { detail: { error: "invalid API key" } };
    const { loaded } = await h.wire(401, {
        detail: { ...refusal.detail, customer_id: "cus_synthetic-0001" },
    });
    const result = await loaded.run({});
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, refusal);
});

// There is no input to refuse: the compiled input schema is empty. So the
// gate is pinned the other way round: no field is declared, and the empty
// input runs.
Deno.test("me takes no input", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.input, { schema: {} });
    await assertInputAccepted({
        unit,
        input: {},
        mode: "replay",
        fixture: await h.fixture("synthetic-sub-account"),
        resources: [OWNED],
    });
});

Deno.test("me declares the sub-account binding", () => h.assertBinding());

Deno.test("me fails closed without a sub-account", () =>
    h.assertFailsClosed({}));

Deno.test("me sends a bodyless GET with the workspace's sub-account", () =>
    h.assertOnTheWire({}, {
        method: "GET",
        url: "https://api.voygr.tech/users/me",
    }));

Deno.test({
    name:
        "voygr#me live: only the allowlisted limits come back, each of its type",
    ignore: liveSkip("voygr"),
    fn: async () => {
        const result = await h.live({});
        assertEquals(result.httpStatus, 200, JSON.stringify(result));
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        // VOYGR documents none of the four as always present, so a key may
        // be missing. What is there is one of the four, of its type.
        const out = result.output as Me;
        const types: Record<string, string> = {
            max_concurrent_calls: "number",
            max_calls_per_day: "number",
            credits_charge_per_successful_call: "number",
            maintenance: "object", // null, or the window that is set
        };
        for (const [key, value] of Object.entries(out)) {
            assert(key in types, `${key} is not an allowlisted field`);
            assertEquals(typeof value, types[key], key);
        }
    },
});
