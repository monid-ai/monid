import { assert, assertEquals } from "@std/assert";
import { assertInputAccepted, liveSkip, testSealedUnit } from "@shared/testing";
import { harness, OWNED } from "../../test-support.ts";

/**
 * `voygr#list-skills`. `happy` is a real answer from api.voygr.tech
 * (2026-10-27): the skill catalogue is public data, recorded without a
 * sub-account.
 */

const ID = "voygr#list-skills";
const h = harness(ID, import.meta.url);

Deno.test("list-skills replays the catalogue for free", async () => {
    const result = await h.run("happy", {});
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, await h.recorded("happy"));
    const skills = result.output as { skill_id: string }[];
    assertEquals(skills.map((s) => s.skill_id), [
        "cancel-booking",
        "concierge",
        "restaurant-reservation",
    ]);
});

Deno.test("list-skills 401 settles zero and passes through", async () => {
    const result = await h.run("synthetic-invalid-key-401", {});
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, await h.recorded("synthetic-invalid-key-401"));
    assertEquals(result.output, { detail: { error: "invalid API key" } });
});

// There is no input to refuse: the compiled input schema is empty. So the
// gate is pinned the other way round: no field is declared, and the empty
// input runs.
Deno.test("list-skills takes no input", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.input, { schema: {} });
    await assertInputAccepted({
        unit,
        input: {},
        mode: "replay",
        fixture: await h.fixture("happy"),
        resources: [OWNED],
    });
});

Deno.test("list-skills declares the sub-account binding", () =>
    h.assertBinding());

Deno.test("list-skills fails closed without a sub-account", () =>
    h.assertFailsClosed({}));

Deno.test("list-skills sends a bodyless GET with the workspace's sub-account", () =>
    h.assertOnTheWire({}, {
        method: "GET",
        url: "https://api.voygr.tech/skills",
    }, { body: [] }));

Deno.test({
    name: "voygr#list-skills live: the catalogue lists skills with their ids",
    ignore: liveSkip("voygr"),
    fn: async () => {
        const result = await h.live({});
        assertEquals(result.httpStatus, 200, JSON.stringify(result));
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const skills = result.output as { skill_id: string }[];
        assert(Array.isArray(skills), JSON.stringify(skills));
        assert(skills.length > 0, "the catalogue is empty");
        for (const skill of skills) {
            assertEquals(typeof skill.skill_id, "string");
        }
    },
});
