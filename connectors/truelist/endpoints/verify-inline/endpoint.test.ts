import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const ID = "truelist#api/v1/verify_inline";
const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

/**
 * Every recorded verdict and what it draws (truelist.io/pricing:
 * unknown and accept_all are free). Literals on purpose — deriving them
 * from the doc's own model would make this a tautology.
 */
const VERDICTS: Record<
    string,
    { email: string; state: string; sub: string; billed: 0 | 1 }
> = {
    ok: {
        email: "jane.doe@example.com",
        state: "ok",
        sub: "email_ok",
        billed: 1,
    },
    role: {
        email: "support@github.com",
        state: "risky",
        sub: "is_role",
        billed: 1,
    },
    invalid: {
        email: "zzqx-no-such-user-8812@gmail.com",
        state: "email_invalid",
        sub: "failed_no_mailbox",
        billed: 1,
    },
    "catch-all": {
        email: "abcxyz123@truelist.io",
        state: "risky",
        sub: "accept_all",
        billed: 0,
    },
    unknown: {
        email: "nonexistent-qq81@microsoft.com",
        state: "unknown",
        sub: "timed_out",
        billed: 0,
    },
};

for (const [name, v] of Object.entries(VERDICTS)) {
    Deno.test(`${ID} ${name} (recorded): ${v.billed ? "one credit" : "free"}`, async () => {
        const unit = await testSealedUnit(ID);
        const fixture = await loadFixture(`${fixturesDir}${name}.json`);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { email: v.email } },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(
            result.usage,
            v.billed
                ? { credits: { default: 1 }, evidence: { RESULT: 1 } }
                : { credits: {}, evidence: { RESULT: 0 } },
        );
        const emails = (result.output as Record<string, unknown>)
            .emails as Record<string, unknown>[];
        assertEquals(emails.length, 1);
        assertEquals(emails[0].email_state, v.state);
        assertEquals(emails[0].email_sub_state, v.sub);
    });
}

for (
    const [name, status, error] of [
        ["unauthorized", 401, "Could not find user via token"],
        ["rate-limited", 429, "Rate limit exceeded. Please try again later."],
    ] as const
) {
    Deno.test(`${ID} ${name} (recorded ${status}): data, zero usage`, async () => {
        const unit = await testSealedUnit(ID);
        const fixture = await loadFixture(`${fixturesDir}${name}.json`);
        const email = name === "unauthorized"
            ? "support@github.com"
            : "jane.doe@example.com";
        const result = await runEndpoint({
            unit,
            input: { queryParams: { email } },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, { error });
    });
}

Deno.test(`${ID}: email required and well-formed; unknown keys rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}role.json`);
    const rejected: Record<string, Json>[] = [
        {},
        { email: "" },
        { email: "not-an-email" },
        { email: "support@github.com", bogus: 1 },
    ];
    for (const queryParams of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(queryParams),
        );
    }
});

Deno.test("truelist: provider wiring, one pool, PER_UNIT 1 credit, POST", async () => {
    const bundle = await testBundle();
    const doc = bundle.endpoints[ID];
    assert(doc, "truelist#api/v1/verify_inline compiled");
    assertEquals(doc.request.method, "POST");
    assertEquals(Object.keys(doc.usage.credits), ["default"]);
    const model = doc.usage.model;
    assertEquals(model.kind, "PER_UNIT");
    assertEquals(
        "consumes" in model ? model.consumes : undefined,
        { credit: "default", amount: 1 },
    );
    assertEquals(
        Object.keys(bundle.endpoints).filter((id) =>
            id.startsWith("truelist#")
        ),
        [ID],
    );
});

Deno.test({
    name: `${ID} live (gated on TRUELIST_API_KEY)`,
    ignore: liveSkip("truelist"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { email: "support@github.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
        const emails = (result.output as Record<string, unknown>)
            .emails as Record<string, unknown>[];
        assertEquals(typeof emails[0].email_state, "string");
    },
});
