import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { CONTACTOUT_KEYS } from "../../schema/auth.ts";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "contactout#v1/people/linkedin/personal_email_status";
const PROFILE = "https://www.linkedin.com/in/example-person";

Deno.test(`${ID} happy (synthetic): FREE flag under the personal key`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { profile: PROFILE } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the personal checker answers the flag under a bare `email` key (the
    // key kind is the ACCOUNT's, not the field's — design D3)
    assertEquals(
        (result.output as { profile: { email: boolean } }).profile.email,
        true,
    );
});

Deno.test(`${ID} provider error (synthetic 401): data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { profile: PROFILE } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 401);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: only a LinkedIn profile URL, and the valid forms pass`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    for (
        const bad of [
            "https://github.com/example",
            "https://evil.example/?u=linkedin.com/in/example-person",
            "https://www.linkedin.com/company/example",
        ]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams: { profile: bad } },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            bad,
        );
    }
    for (
        const ok of [
            "https://uk.linkedin.com/in/example-person",
            "https://www.linkedin.com/pub/example-person",
        ]
    ) {
        await assertInputAccepted({
            unit,
            input: { queryParams: { profile: ok } },
            mode: "replay",
            fixture,
        });
    }
});

Deno.test({
    name: `${ID} live (gated on the contactout credentials)`,
    ignore: liveSkip("contactout", CONTACTOUT_KEYS),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    profile: "https://www.linkedin.com/in/williamhgates",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
