import { assert, assertEquals, assertRejects } from "@std/assert";
import { type Json, type RunInput } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { harness, OWNED } from "../../test-support.ts";

/**
 * `voygr#skill-manifest`. `happy` and `unknown-skill` are real answers from
 * api.voygr.tech (2026-10-27): a skill's manifest is public catalogue data,
 * recorded without a sub-account.
 */

const ID = "voygr#skill-manifest";
const h = harness(ID, import.meta.url);

Deno.test("skill-manifest replays a manifest for free", async () => {
    const result = await h.run("happy", {
        pathParams: { skill_id: "concierge" },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, await h.recorded("happy"));
    const manifest = result.output as {
        skill_id: string;
        input_schema: { required: string[] };
    };
    assertEquals(manifest.skill_id, "concierge");
    assertEquals(manifest.input_schema.required, ["venue_phone", "brief"]);
});

Deno.test("skill-manifest unknown skill 404 settles zero and passes through", async () => {
    const result = await h.run("unknown-skill", {
        pathParams: { skill_id: "no-such-skill" },
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, await h.recorded("unknown-skill"));
});

Deno.test("skill-manifest schema: skill_id is required and non-empty", async () => {
    const unit = await testSealedUnit(ID);
    const rejected: [string, RunInput][] = [
        ["no path params", {}],
        ["no skill_id", { pathParams: {} }],
        ["empty skill_id", { pathParams: { skill_id: "" } }],
        ["a typo'd key", { pathParams: { skillid: "concierge" } }],
        ["a number", { pathParams: { skill_id: 7 as unknown as string } }],
    ];
    for (const [shape, input] of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input,
                    mode: "replay",
                    resources: [OWNED],
                }),
            Error,
            "INVALID_INPUT",
            shape,
        );
    }
    await assertInputAccepted({
        unit,
        input: { pathParams: { skill_id: "concierge" } },
        mode: "replay",
        fixture: await h.fixture("happy"),
        resources: [OWNED],
    });
});

Deno.test("skill-manifest declares the sub-account binding", () =>
    h.assertBinding());

Deno.test("skill-manifest fails closed without a sub-account", () =>
    h.assertFailsClosed({ pathParams: { skill_id: "concierge" } }));

Deno.test("skill-manifest sends a bodyless GET with the workspace's sub-account", () =>
    h.assertOnTheWire({ pathParams: { skill_id: "concierge" } }, {
        method: "GET",
        url: "https://api.voygr.tech/skills/concierge/manifest",
    }));

Deno.test("skill-manifest encodes the skill id into one path segment", () =>
    h.assertOnTheWire({ pathParams: { skill_id: "../calls" } }, {
        method: "GET",
        url: "https://api.voygr.tech/skills/..%2Fcalls/manifest",
    }));

Deno.test({
    name:
        "voygr#skill-manifest live: a manifest names its skill and its input schema",
    ignore: liveSkip("voygr"),
    fn: async () => {
        const result = await h.live({ pathParams: { skill_id: "concierge" } });
        assertEquals(result.httpStatus, 200, JSON.stringify(result));
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const manifest = result.output as {
            skill_id: string;
            input_schema: { required: string[] };
        };
        assertEquals(manifest.skill_id, "concierge");
        assert(Array.isArray(manifest.input_schema.required));
    },
});
