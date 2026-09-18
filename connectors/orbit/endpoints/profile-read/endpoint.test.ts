import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const PROFILE = "a23ff3b7-b6cc-4ac6-8d4f-0c909cd956f5";

Deno.test("orbit#v3/profile/{profile_id}: one flat credit, and the profile rides through whole", async () => {
    const unit = await testSealedUnit("orbit#v3/profile/{profile_id}");
    const result = await runEndpoint({
        unit,
        input: { pathParams: { profile_id: PROFILE } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-profile-read.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.generation_level, 3);
    // The stored profile rides through whole, with no billing field
    // invented or stripped on the way.
    const profile = output.profile as Record<string, unknown>;
    assertEquals((profile.sections as unknown[]).length, 1);
    for (const field of ["billing", "credits", "usage", "consumed_credits"]) {
        assertEquals(field in output, false, `${field} must not appear`);
    }
});

Deno.test("orbit#v3/profile/{profile_id}: the identity is DECLARED, the call is the vendor's", async () => {
    const unit = await testSealedUnit("orbit#v3/profile/{profile_id}");
    // The read and the build share `/v3/enrich/{profile_id}` on Orbit's
    // side, and two defs on one path collide — so the read takes the name
    // Orbit's own `links.profile` gives it while still calling the vendor
    // path unchanged.
    assertEquals(unit.doc.id, "orbit#v3/profile/{profile_id}");
    assertEquals(unit.doc.request.method, "GET");
    assertEquals(
        unit.doc.request.url,
        "https://api.orbitsearch.com/v3/enrich/{profile_id}",
    );
});

Deno.test("orbit#v3/profile/{profile_id}: a vendor refusal is zero-billed data", async () => {
    const unit = await testSealedUnit("orbit#v3/profile/{profile_id}");
    const result = await runEndpoint({
        unit,
        input: { pathParams: { profile_id: PROFILE } },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-profile-read-error.json`,
        ),
    });

    // A flat PER_CALL endpoint still bills nothing on a provider error —
    // the engine forces it, and this is the test that says so.
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("orbit#v3/profile/{profile_id}: the gate rejects an empty id, and passes a real one", async () => {
    const unit = await testSealedUnit("orbit#v3/profile/{profile_id}");
    const fixture = await loadFixture(`${chains}synthetic-profile-read.json`);

    // NEAR-VALID and bad: the right field, the wrong value. An empty id
    // would otherwise resolve to `/v3/enrich/`, which is a different route.
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { profile_id: "" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );

    // The near-twin that must pass, so the gate is not simply too wide —
    // a public slug is as valid as a uuid here.
    await assertInputAccepted({
        unit,
        input: { pathParams: { profile_id: "ada-fielding" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "orbit#v3/profile/{profile_id} live: a read answers with a profile",
    ignore: liveSkip("orbit"),
    fn: async () => {
        const unit = await testSealedUnit("orbit#v3/profile/{profile_id}");
        const result = await runEndpoint({
            unit,
            input: { pathParams: { profile_id: PROFILE } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // SHAPE, not amounts: a settled read draws from the one declared
        // pool and returns a profile at a stated depth.
        const pools = Object.keys(result.usage.credits);
        assert(pools.length === 0 || pools.join() === "default", pools.join());
        const output = result.output as Record<string, unknown>;
        assert("profile" in output, JSON.stringify(output).slice(0, 200));
        assert("generation_level" in output);
    },
});
