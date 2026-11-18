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
const ID = "worklittle#apply/profile";

Deno.test("worklittle#apply/profile save (synthetic): new applicant_id, free", async () => {
    const result = await replay(ID, {
        body: {
            action: "save",
            name: "Jordan Rivera",
            email: "jordan@example.com",
            city: "Austin",
            resume_file: {
                filename: "jordan-rivera.pdf",
                content_base64: "JVBERi0xLjQK",
            },
        },
    }, "synthetic-applicant-save");
    assertEquals(result.httpStatus, 201);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { applicant_id: string }).applicant_id,
        "usr_synthetic_applicant",
    );
});

Deno.test("worklittle#apply/profile get (synthetic): profile, applications and emails", async () => {
    const result = await replay(ID, {
        body: { action: "get", applicant_id: "usr_synthetic_applicant" },
    }, "synthetic-applicant-get");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const out = result.output as {
        applicant: { id: string };
        applications: unknown[];
        emails: unknown[];
    };
    assertEquals(out.applicant.id, "usr_synthetic_applicant");
    assertEquals(out.applications.length, 1);
    assertEquals(out.emails.length, 1);
});

Deno.test("worklittle#apply/profile get: unknown id is a free 404", async () => {
    const result = await replay(ID, {
        body: { action: "get", applicant_id: "usr_nobody" },
    }, "synthetic-applicant-not-found");
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("worklittle#apply/profile delete (synthetic): erased, free", async () => {
    const result = await replay(ID, {
        body: { action: "delete", applicant_id: "usr_synthetic_applicant" },
    }, "synthetic-applicant-delete");
    assertEquals(result.httpStatus, 200);
    assertEquals((result.output as { status: string }).status, "deleted");
});

Deno.test("worklittle#apply/profile: action and the right fields are required", async () => {
    await rejects(
        ID,
        { body: { name: "J", email: "j@example.com" } },
        "no action",
    );
    await rejects(
        ID,
        { body: { action: "save", email: "j@example.com" } },
        "new without name",
    );
    await rejects(ID, { body: { action: "get" } }, "get without id");
    await rejects(ID, { body: { action: "delete" } }, "delete without id");
    await rejects(
        ID,
        { body: { action: "merge", applicant_id: "a" } },
        "unknown action",
    );
});
