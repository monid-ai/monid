import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "dataforb2b#enrich/profile";
const PROFILE = "prof_PVURNGJihYludzaOwFCAwNajijSHFi6H0L9R";

const enrich = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("dataforb2b#enrich/profile: every requested item found, the receipt and the card agree", async () => {
    const result = await enrich("enrich-profile.json", {
        profile_identifier: PROFILE,
        enrich_profile: true,
        enrich_work_email: true,
        enrich_personal_email: true,
        enrich_phone: true,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // 1.5 + 1 + 3 + 10
    assertEquals(result.usage, {
        credits: { default: 15.5 },
        evidence: { profile: 1, work_email: 1, personal_email: 1, phone: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_used" in output, false);
    assertEquals(output.git_profile, null);
});

Deno.test("dataforb2b#enrich/profile: misses are not counted", async () => {
    // same exchange with the phone and personal email not found: the
    // evidence drops those lines (the receipt, when present, still bills)
    const fixture = await loadFixture(`${chains}enrich-profile.json`);
    const res = fixture.calls[0].res as { body: Record<string, Json> };
    res.body = {
        ...res.body,
        personal_email: null,
        phone: null,
        credits_used: 2.5,
    };
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                profile_identifier: PROFILE,
                enrich_profile: true,
                enrich_work_email: true,
                enrich_personal_email: true,
                enrich_phone: true,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { default: 2.5 },
        evidence: { profile: 1, work_email: 1 },
    });
});

Deno.test("dataforb2b#enrich/profile: 404 is data, zero usage", async () => {
    const result = await enrich("enrich-not-found.json", {
        profile_identifier: "no-such-person",
        enrich_profile: true,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("dataforb2b#enrich/profile: estimate sums the requested items at the card", async () => {
    const unit = await testSealedUnit(ID);
    const all = await estimateEndpoint(unit, {
        body: {
            profile_identifier: PROFILE,
            enrich_profile: true,
            enrich_work_email: true,
            enrich_personal_email: true,
            enrich_phone: true,
            enrich_github: true,
        },
    });
    assertEquals(all.credits, { default: 15.5 });
    // GitHub alone implies the profile and is otherwise free
    const github = await estimateEndpoint(unit, {
        body: { profile_identifier: PROFILE, enrich_github: true },
    });
    assertEquals(github.credits, { default: 1.5 });
    const email = await estimateEndpoint(unit, {
        body: { profile_identifier: PROFILE, enrich_work_email: true },
    });
    assertEquals(email.credits, { default: 1 });
});

Deno.test("dataforb2b#enrich/profile: at least one enrich_* flag must be true", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}enrich-profile.json`,
    );
    const rejected: Json[] = [
        { profile_identifier: PROFILE },
        { profile_identifier: PROFILE, enrich_profile: false },
        { profile_identifier: "", enrich_profile: true },
        { enrich_profile: true },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
});

Deno.test({
    name: "dataforb2b#enrich/profile live (gated on DATAFORB2B_API_KEY)",
    ignore: liveSkip("dataforb2b"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    profile_identifier: "williamhgates",
                    enrich_profile: true,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
