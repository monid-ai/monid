import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json, RunInput } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const replay = async (id: string, input: RunInput, name?: string) =>
    await runEndpoint({
        unit: await testSealedUnit(id),
        input,
        mode: "replay",
        ...(name
            ? { fixture: await loadFixture(`${fixturesDir}${name}.json`) }
            : {}),
    });
const rejects = async (id: string, input: RunInput, why: string) =>
    await assertRejects(
        () => replay(id, input),
        Error,
        "INVALID_INPUT",
        why,
    );

const ID = "worklittle#companies/search";

Deno.test("worklittle#companies/search happy (synthetic): slug, free, receipt stripped", async () => {
    const result = await replay(
        ID,
        { queryParams: { q: "stripe", limit: 2 } },
        "synthetic-companies-ok",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const out = result.output as {
        data: Array<{ slug: string }>;
        meta: Record<string, unknown>;
    };
    assertEquals(out.data[0].slug, "stripe");
    assertEquals("billing" in out.meta, false);
});

Deno.test("worklittle#companies/search: q 2–80 chars, limit 1–20", async () => {
    const bad: Record<string, Json>[] = [
        {},
        { q: "s" },
        { q: "x".repeat(81) },
        {
            q: "stripe",
            limit: 21,
        },
        { q: "stripe", limit: 0 },
    ];
    for (const queryParams of bad) {
        await rejects(ID, { queryParams }, JSON.stringify(queryParams));
    }
});
