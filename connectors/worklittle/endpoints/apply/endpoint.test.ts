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
const ID = "worklittle#apply";
const INPUT: RunInput = {
    body: {
        applicant_id: "usr_synthetic_applicant",
        job_ids: [
            "synthetic-job-1",
            "synthetic-job-2",
            "synthetic-job-3",
            "synthetic-job-4",
        ],
    },
};

Deno.test("worklittle#apply (synthetic): polls every started application; bills outcomes only", async () => {
    const result = await replay(ID, INPUT, "synthetic-apply-batch");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.evidence, { RESULT: 2 });
    assertEquals(result.usage.credits, { default: 0.4 });
    const out = result.output as {
        applicant_id: string;
        jobs: Array<
            { job_id: string; status: string | null; error_code: string | null }
        >;
    };
    assertEquals(out.applicant_id, "usr_synthetic_applicant");
    assertEquals(out.jobs.map((j) => j.status), [
        "completed",
        "completed",
        null,
        null,
    ]);
    assertEquals(out.jobs[2].error_code, "JOB_CLOSED");
});

Deno.test("worklittle#apply: a failed application is free", async () => {
    const result = await replay(ID, {
        body: {
            applicant_id: "usr_synthetic_applicant",
            job_ids: ["synthetic-job-1"],
        },
    }, "synthetic-apply-batch-failed");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test("worklittle#apply: 1–10 job_ids, applicant required", async () => {
    const bad: Json[] = [
        { applicant_id: "a", job_ids: [] },
        {
            applicant_id: "a",
            job_ids: Array.from({ length: 11 }, (_, i) => "j" + i),
        },
        { job_ids: ["j"] },
        { applicant_id: "a", job_id: "j" },
    ];
    for (const body of bad) await rejects(ID, { body }, JSON.stringify(body));
});
