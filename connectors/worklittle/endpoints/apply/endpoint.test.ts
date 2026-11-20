import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json, RunInput } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadEndpoint,
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
    assertEquals(result.httpStatus, 502);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assert(
        JSON.stringify(result.output).includes(
            "The employer's site showed a bot check.",
        ),
        "the polled failure reason reaches the output",
    );
});

Deno.test("worklittle#apply: { test: true } alone is a free practice run", async () => {
    const result = await replay(
        ID,
        { body: { test: true } },
        "synthetic-apply-practice",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    const out = result.output as Record<string, unknown>;
    assertEquals(out.test, true);
    assertEquals(out.billing, undefined);
});

Deno.test("worklittle#apply: stop at runMs settles what finished and cancels nothing", async () => {
    const input: RunInput = {
        body: {
            applicant_id: "usr_synthetic_applicant",
            job_ids: ["synthetic-job-1", "synthetic-job-2"],
        },
    };
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input,
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-apply-batch-stop.json`,
        ),
    });
    const run = { runId: "test-run-stop" };
    const started = await loaded.start(input, run);
    assert(started.kind === "RUNNING");
    // the fixture has no cancel call: a DELETE/stop request would fail
    const stopped = await loaded.stop(input, started.state, run);
    assert(stopped.kind === "COMPLETED", "stop settles");
    assertEquals(stopped.usage.credits, { default: 0.2 });
    assertEquals(stopped.usage.evidence, { RESULT: 1 });
    const out = stopped.output as {
        jobs: Array<{ session_id: string; status: string }>;
    };
    assertEquals(out.jobs.map((j) => [j.session_id, j.status]), [
        ["aas_s1", "completed"],
        ["aas_s2", "running"],
    ]);
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
