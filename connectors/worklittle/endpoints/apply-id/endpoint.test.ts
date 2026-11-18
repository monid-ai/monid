import { assertEquals, assertRejects } from "@std/assert";
import type { RunInput } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

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
const ID = "worklittle#apply/{id}";

Deno.test("worklittle#apply/{id} continue (synthetic): answers sent, free", async () => {
    const result = await replay(ID, {
        pathParams: { id: "aas_synthetic01" },
        body: { action: "continue", answers: { visa_status: "US citizen" } },
    }, "synthetic-apply-application");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals((result.output as { continued: boolean }).continued, true);
});

Deno.test("worklittle#apply/{id}: id, a known action, answers for continue", async () => {
    await rejects(ID, { pathParams: {}, body: { action: "status" } }, "no id");
    await rejects(
        ID,
        { pathParams: { id: "a" }, body: { action: "steer" } },
        "steer not listed",
    );
    await rejects(
        ID,
        { pathParams: { id: "a" }, body: { action: "continue" } },
        "continue without answers",
    );
    await rejects(ID, {
        pathParams: { id: "a" },
        body: { action: "stop", answers: {} },
    }, "stray field");
});
