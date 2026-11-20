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
const ID = "worklittle#cover-letters";

Deno.test("worklittle#cover-letters async (synthetic): done settles $0.01", async () => {
    const result = await replay(ID, {
        body: {
            resume_text: "Jordan Rivera | jordan@example.com",
            company: "Acme Pay",
            role: "Senior Product Manager",
            formats: ["html", "pdf"],
        },
    }, "synthetic-cover-letter-async");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { CALL: 1 },
    });
    const out = result.output as Record<string, unknown>;
    assertEquals(out.document_type, "cover_letter");
});

Deno.test("worklittle#cover-letters: unknown keys and bad formats rejected", async () => {
    await rejects(ID, { body: { tone: "warm" } }, "unknown key");
    await rejects(ID, { body: { formats: [] } }, "empty formats");
});
